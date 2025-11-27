// ←←←←← غيّر هذين السطرين فقط بمعلوماتك ↓↓↓↓↓
const FOLDER_ID = "1hNd3Qe6NW0LwTddoNAwnKGHYEym5QcD__V1svSbrbcA";  // معرف مجلد Drive
const ALLOWED_EMAILS = [
  "newmohamed1443@gmail.com",      // ← أضف إيميلات المصرح لهم هنا
  "user1@company.com",
  "user2@company.com"
];
// ←←←←← لا تغير شيء بعد هذا السطر ↓↓↓↓↓

const SHEET_NAME = "التعديات";

function doGet(e) {
  const userEmail = Session.getActiveUser().getEmail();
  if (userEmail && !ALLOWED_EMAILS.includes(userEmail)) {
    return HtmlService.createHtmlOutput(`
      <h2 style="text-align:center;color:red;font-family:Tajawal,Arial,sans-serif;direction:rtl;padding:50px;">
        غير مصرح لك بالوصول إلى النظام<br><br>
        البريد المسجل: ${userEmail}
      </h2>`);
  }

  const page = (e.parameter.page || "home").toLowerCase();
  if (page === "form") {
    return HtmlService.createHtmlOutputFromFile("form")
      .setTitle("إضافة تعدي جديد")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("نظام إدارة التعديات")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getAllEncroachments() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0];
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, j) => row[h] = data[i][j] || "");
    result.push(row);
  }
  return result;
}

function addEncroachment(formData) {
  try {
    const sheet = getOrCreateSheet();
    const folder = DriveApp.getFolderById(FOLDER_ID);

    const areas = [formData.eastArea, formData.westArea, formData.northArea, formData.southArea]
      .map(n => Number(n) || 0);
    const totalArea = areas.reduce((a, b) => a + b, 0);

    const photoUrls = formData.photos ? uploadFiles(formData.photos, folder, "صورة") : [];
    const docUrls = formData.docs ? uploadFiles(formData.docs, folder, "وثيقة") : [];

    const today = Utilities.formatDate(new Date(), "GMT+3", "yyyyMMdd");
    const seq = String(sheet.getLastRow()).padStart(4, "0");
    const uniqueId = `ENC-${today}-${seq}`;

    const row = [
      new Date(), formData.serialNumber||"", formData.newspaperNumber||"",
      formData.landType||"", formData.basin||"", formData.side||"",
      formData.originalTenant||"", formData.encroacherName||"", formData.relation||"",
      formData.eastBorder||"", formData.eastArea||"",
      formData.westBorder||"", formData.westArea||"",
      formData.northBorder||"", formData.northArea||"",
      formData.southBorder||"", formData.southArea||"",
      totalArea,
      photoUrls.join(" | "),
      formData.latLng||"", formData.mapLink||"",
      docUrls.join(" | "),
      "", formData.responsibleAuthority||"", formData.outgoingNumber||"",
      "قيد المتابعة", formData.notes||"", uniqueId
    ];

    sheet.appendRow(row);
    return { success: true, message: "تم الإضافة بنجاح", id: uniqueId };
  } catch (e) {
    console.error(e);
    return { success: false, message: "خطأ: " + e.toString() };
  }
}

function uploadFiles(filesArray, folder, prefix) {
  return filesArray.map(item => {
    try {
      const match = item.data.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) return "خطأ base64";
      let name = item.name || `${prefix}_${Date.now()}`;
      name = name.replace(/[^ا-يa-zA-Z0-9_\-\.]/g, "_");
      const blob = Utilities.newBlob(Utilities.base64Decode(match[2]), match[1], name);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    } catch (e) {
      return "خطأ رفع";
    }
  });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "التاريخ","رقم التعدي","رقم الصحيفة","نوع الأرض","الحوض","الجهة",
      "المستأجر الأصلي","اسم المتعدي","صلة القرابة",
      "حد شرقي","مساحة شرق","حد غربي","مساحة غرب",
      "حد شمالي","مساحة شمال","حد جنوبي","مساحة جنوب",
      "المساحة الكلية","روابط الصور","الإحداثيات","رابط الخريطة",
      "روابط الوثائق","حالة الإزالة","الجهة المسؤولة","رقم الصادر",
      "الحالة","ملاحظات","معرف التعدي"
    ]);
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
  }
  return sheet;
}