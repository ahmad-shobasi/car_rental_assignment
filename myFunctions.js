$(document).ready(function () {
  /* Show or hide each car's details using jQuery. */
  $(".details-row").hide();
  $(".details-toggle").change(function () {
    var rowId = "#row-" + $(this).attr("id");
    if ($(this).is(":checked")) {
      $(rowId).show();
    } else {
      $(rowId).hide();
    }
  });

  /* Display the booking form after at least one car is selected. */
  $("#continueButton").click(function () {
    var selectedCars = $(".car-select:checked");
    if (selectedCars.length === 0) {
      alert("يرجى اختيار سيارة واحدة على الأقل قبل المتابعة.");
      return;
    }
    $("#bookingArea").removeClass("hidden").show();
    $("#bookingArea").get(0).scrollIntoView(true);
  });

  /* Validate the form and calculate the rental amount. */
  $("#bookingForm").submit(function (event) {
    event.preventDefault();

    var fullName = $.trim($("#fullName").val());
    var nationalId = $.trim($("#nationalId").val());
    var startText = $.trim($("#startDate").val());
    var endText = $.trim($("#endDate").val());
    var mobile = $.trim($("#mobile").val());
    var email = $.trim($("#email").val());
    var errors = [];

    if (fullName !== "" && !/^[\u0621-\u064A ]+$/.test(fullName)) {
      errors.push("الاسم يجب أن يحتوي على أحرف عربية ومسافات فقط.");
    }

    if (!/^\d{11}$/.test(nationalId)) {
      errors.push("الرقم الوطني يجب أن يتكون من 11 خانة.");
    } else {
      var provinceCode = parseInt(nationalId.substring(0, 2), 10);
      if (provinceCode < 1 || provinceCode > 14) {
        errors.push("أول خانتين من الرقم الوطني يجب أن تكونا بين 01 و14.");
      }
    }

    var startDate = parseDate(startText);
    var endDate = parseDate(endText);
    if (startDate === null) {
      errors.push(
        "تاريخ البداية مطلوب ويجب أن يكون بصيغة yyyy-mm-dd وتاريخاً صحيحاً.",
      );
    }
    if (endDate === null) {
      errors.push(
        "تاريخ النهاية مطلوب ويجب أن يكون بصيغة yyyy-mm-dd وتاريخاً صحيحاً.",
      );
    }
    if (
      startDate !== null &&
      endDate !== null &&
      endDate.getTime() <= startDate.getTime()
    ) {
      errors.push("يجب أن يكون تاريخ نهاية التأجير لاحقاً لتاريخ البداية.");
    }

    if (mobile !== "" && !/^(093|094|095|096|098|099)\d{7}$/.test(mobile)) {
      errors.push(
        "رقم الموبايل غير صحيح. أدخل رقماً من شبكتي Syriatel أو MTN.",
      );
    }

    if (
      email !== "" &&
      !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
    ) {
      errors.push("البريد الإلكتروني غير صحيح.");
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    var selected = $(".car-select:checked");
    if (selected.length === 0) {
      alert("لم يتم اختيار أي سيارة. ارجع إلى الجدول واختر سيارة.");
      return;
    }

    var rentalDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86400000,
    );
    var totalBeforeDiscount = 0;
    var resultHtml = "<h3>ملخص طلب الحجز</h3>";
    resultHtml += "<p>الرقم الوطني: " + escapeHtml(nationalId) + "</p>";
    resultHtml += "<p>مدة التأجير: " + rentalDays + " يوم</p>";
    resultHtml +=
      '<table class="simple-table"><tr><th>رمز السيارة</th><th>السعر اليومي</th><th>عدد الأيام</th><th>المبلغ</th></tr>';

    selected.each(function () {
      var code = $(this).val();
      var car = getCarInfo(code);
      var amount = car.price * rentalDays;
      totalBeforeDiscount += amount;
      resultHtml +=
        "<tr><td>" +
        car.code +
        "</td><td>" +
        formatNumber(car.price) +
        " ل.س</td><td>" +
        rentalDays +
        "</td><td>" +
        formatNumber(amount) +
        " ل.س</td></tr>";
    });

    var discount = 0;
    if (rentalDays > 7) {
      discount = totalBeforeDiscount * 0.1;
    }
    var finalAmount = totalBeforeDiscount - discount;
    resultHtml += "</table>";
    resultHtml +=
      "<p>المجموع قبل الخصم: <strong>" +
      formatNumber(totalBeforeDiscount) +
      " ل.س</strong></p>";
    resultHtml +=
      "<p>الخصم: <strong>" + formatNumber(discount) + " ل.س</strong>";
    if (rentalDays > 7) {
      resultHtml += " (10%)";
    } else {
      resultHtml += " (لا يوجد خصم لأن المدة لا تتجاوز 7 أيام)";
    }
    resultHtml +=
      '</p><p class="final-price">المبلغ النهائي: ' +
      formatNumber(finalAmount) +
      " ل.س</p>";
    resultHtml +=
      "<p>تم التحقق من البيانات بنجاح. هذا ملخص تجريبي لطلب الحجز وليس تأكيداً نهائياً.</p>";

    $("#resultBox").html(resultHtml).removeClass("hidden").show();
    $("#resultBox").get(0).scrollIntoView(true);
  });
});

/* Check the date format and make sure the date really exists. */
function parseDate(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return null;
  }
  var parts = dateText.split("-");
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  var date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/* Return the daily price for the selected car. */
function getCarInfo(code) {
  var cars = [
    { code: "CR-001", price: 1750 },
    { code: "CR-002", price: 3500 },
    { code: "CR-003", price: 2000 },
    { code: "CR-004", price: 1800 },
    { code: "CR-005", price: 5000 },
  ];
  for (var i = 0; i < cars.length; i++) {
    if (cars[i].code === code) {
      return cars[i];
    }
  }
  return { code: code, price: 0 };
}

function formatNumber(number) {
  return Math.round(number)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* Keep user-entered text safe when it is displayed in the result. */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
