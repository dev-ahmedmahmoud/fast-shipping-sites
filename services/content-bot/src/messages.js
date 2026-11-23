// Everything the app says. Arabic only.
const M = {
  tooMany: 'لديك طلبان قيد التنفيذ. انتظر حتى ينتهيا.',
  slowDown: 'طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  sendFailed: 'تعذّر إرسال الطلب إلى الوكيل. حاول مرة أخرى بعد دقيقة.',
  timeout: 'لم يرد الوكيل في الوقت المحدد. لم يتغير شيء. حاول مرة أخرى أو تواصل مع أحمد.',
  textOnly: 'أستطيع تغيير النصوص فقط. للتعديلات على التصميم تواصل مع أحمد.',
  notSafe: 'لم أستطع تنفيذ هذا التعديل بأمان: أعدّل أو أضيف أو أحذف نقاطًا ونصوصًا فقط، ولا أغيّر شكل الصفحة. اكتب الطلب بشكل أوضح أو تواصل مع أحمد.',
  noChange: 'لم يجد الوكيل ما يغيّره. اكتب النص الحالي والنص الجديد بوضوح.',
  notFromRequest: 'النص الجديد فيه كلمات لم تكتبها. اكتب النص الجديد بالضبط كما تريده.',
  tooLong: 'النص الجديد أطول من اللازم لهذا المكان.',
  markup: 'أستطيع تغيير النص العادي فقط (بدون وسوم أو رموز مثل < >).',
  badValue: 'هذه القيمة لا تبدو صحيحة (رقم هاتف أو بريد أو رابط https).',
  empty: 'لا أستطيع حذف النص أو تركه فارغًا.',
  stale: 'تغيّرت الصفحة أثناء التنفيذ. لم يتغير شيء. أرسل الطلب مرة أخرى.',
  error: 'حدث خطأ ولم يتغير شيء. حاول مرة أخرى أو تواصل مع أحمد.',
  buildFailed: 'تم حفظ التعديل لكن تحديث الموقع فشل. أحمد سيتحقق.',
  notAllowed: 'لا تملك صلاحية لهذا الإجراء.',
  cannotAbort: 'لا يمكن الإيقاف الآن: الطلب لم يعد قيد التنفيذ.',
  cannotRevert: 'لا يمكن التراجع عن هذا الطلب.',
  revertStale: 'تم تعديل هذا النص مرة أخرى بعد ذلك، لذلك لا أستطيع التراجع تلقائيًا. تواصل مع أحمد.',
  aborted: 'تم إيقاف الطلب. لن يتغير شيء.',
  partSkipped: 'لم أنفّذ:',
  reverted: 'تم التراجع. يعود النص القديم خلال دقيقة تقريبًا.',
};
export const STATUS_AR = {
  working: 'الوكيل يعمل على التعديل…', checking: 'فحص ونشر…', building: 'جارٍ تحديث الموقع…', done: 'تم. حدّث صفحة الموقع.',
  refused: 'لم يُنفَّذ', failed: 'لم يُنفَّذ', aborted: 'تم الإيقاف', reverting: 'جارٍ التراجع…', reverted: 'تم التراجع',
};
export const t = (key) => { if (!M[key]) throw new Error('missing message ' + key); return M[key]; };

/** Map a failed check to what we tell the person. */
export const CHECK_MSG = {
  'structure-changed': 'notSafe', 'unexpected-change': 'notSafe', 'non-string-changed': 'notSafe', 'not-editable-file': 'textOnly', 'not-text-file': 'textOnly',
  'file-added': 'textOnly', 'file-removed': 'textOnly', 'too-many-commits': 'textOnly', 'too-many-edits': 'textOnly', 'unsupported-format': 'textOnly',
  'no-change': 'noChange', same: 'noChange', not_from_request: 'notFromRequest', too_long: 'tooLong', markup: 'markup', bad_chars: 'markup',
  placeholder: 'markup', kind: 'badValue', empty: 'empty', type: 'textOnly',
};
