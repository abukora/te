const SHEET_NAME = "التعديات";
const FOLDER_ID = "1hNd3Qe6NW0LwTddoNAwnKGHYEym5QcD__V1svSbrbcA"; // ← غيّر هذا فقط بمعرف مجلدك في Drive

 function doGet(e) {
  const p = (e.parameter.page || "").toString().toLowerCase().trim();

  // صفحة النموذج
  if (p === "form") {
    return HtmlService.createHtmlOutputFromFile("form")
      .setTitle("form")
      .setTitle("إضافة تعدي جديد")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // الصفحة الرئيسية – نجرب كل الأسماء الممكنة
  const possibleNames = ["Dashboard", "dashboard", "Index", "index", "home", "Home"];
  for (let name of possibleNames) {
    try {
      return HtmlService.createHtmlOutputFromFile(name)
        .setTitle("نظام إدارة التعديات على الأراضي")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (e) {
      // نجرب الاسم التالي
    }
  }

  // لو مفيش ولا اسم نجح → نعرض رسالة واضحة
  return HtmlService.createHtmlOutput("<h3 style='text-align:center;margin-top:100px'>خطأ: ملف الداش بورد غير موجود أو اسمه غلط</h3>");
}
function getAllEncroachments() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.getSheetByName("Sheet1");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] !== undefined ? row[i] : "");
    return obj;
  });
}

function addEncroachment(formData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.getSheetByName("Sheet1");
  const folder = DriveApp.getFolderById(FOLDER_ID);

  const areas = [
    Number(formData.eastArea) || 0,
    Number(formData.westArea) || 0,
    Number(formData.northArea) || 0,
    Number(formData.southArea) || 0
  ];
  const totalArea = areas.reduce((a, b) => a + b, 0);

  const photoUrls = formData.photoBase64 ? uploadFiles(formData.photoBase64, folder) : [];
  const docUrls = formData.docBase64 ? uploadFiles(formData.docBase64, folder) : [];

  const row = [
    new Date(),
    formData.serialNumber || "",
    formData.newspaperNumber || "",
    formData.landType || "",
    formData.basin || "",
    formData.side || "",
    formData.originalTenant || "",
    formData.encroacherName || "",
    formData.relation || "",
    formData.eastBorder || "",
    formData.eastArea || "",
    formData.westBorder || "",
    formData.westArea || "",
    formData.northBorder || "",
    formData.northArea || "",
    formData.southBorder || "",
    formData.southArea || "",
    totalArea,
    photoUrls.join(" | "),
    formData.latLng || "",
    formData.mapLink || "",
    docUrls.join(" | "),
    "",
    formData.responsibleAuthority || "",
    formData.outgoingNumber || "",
    "قيد المتابعة",
    formData.notes || "",
    "ENC" + Date.now()
  ];

  sheet.appendRow(row);
  return { success: true, message: "تم الإضافة بنجاح", id: row[27] };
}

function uploadFiles(base64Array, folder) {
  return base64Array.map(item => {
    try {
      const split = item.split(",")[1];
      const mime = item.match(/data:(.*);base64/)[1];
      const name = "ملف_" + Date.now();
      const blob = Utilities.newBlob(Utilities.base64Decode(split), mime, name);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    } catch (e) {
      return "خطأ رفع";
    }
  });
}
