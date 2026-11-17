// Everything the app says. Arabic only.
const M = {
  designRefused: 'أستطيع تغيير النصوص فقط. للتعديلات على التصميم تواصل مع أحمد.',
  slowDown: 'رسائل كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  busy: 'عذرًا، حدث خطأ ولم يتغير أي شيء. حاول مرة أخرى بعد دقيقة.',
  help: 'اكتب ما تريد تغييره، مثلًا: «غيّر الشعار في الصفحة الرئيسية إلى ...». أغيّر النصوص فقط وليس التصميم. النشر بموافقة {client} فقط.',
  onlyClient: 'النشر أو التراجع بموافقة {client} فقط.',
  unknownChange: 'لا أجد التعديل {id}.',
  notPending: 'التعديل {id} لم يعد في الانتظار ({status}).',
  needId: 'اكتب رقم التعديل مع الرد، مثل: نعم {example}',
  nothingWaiting: 'لا توجد تعديلات في الانتظار.',
  tooManyPending: 'لديك {n} تعديلات في الانتظار. انتظر الرد عليها أولًا.',
  notLive: 'التعديل {id} ليس منشورًا، لذلك لا يمكن التراجع عنه.',
  proposalOwn: 'التعديل {id} جاهز. راجعه ثم اضغط «نشر» أو «رفض».',
  proposalCabinet: 'التعديل {id} جاهز وأُرسل إلى {client} للموافقة. لن يُنشر قبل موافقته.',
  approvalRequest: '{requester} يطلب هذا التعديل ({id}). ينتهي الطلب بعد 24 ساعة.',
  live: 'تم نشر التعديل {id}. يظهر على الموقع خلال دقيقة تقريبًا.',
  liveRequester: 'وافق {client} على التعديل {id}. يظهر على الموقع خلال دقيقة تقريبًا.',
  rejected: 'تم إلغاء التعديل {id}. لم يتغير شيء.',
  rejectedOther: 'تم إلغاء التعديل {id} بواسطة {who}.',
  expired: 'لم يتم الرد على التعديل {id} خلال 24 ساعة وتم إلغاؤه.',
  stale: 'تغيّرت الصفحة منذ هذا الطلب، لذلك لا أستطيع نشر التعديل {id}. أرسل الطلب مرة أخرى.',
  undone: 'تم التراجع عن التعديل {id}. يعود النص القديم خلال دقيقة تقريبًا.',
  undoneOther: 'تراجع {client} عن التعديل {id}.',
  undoStale: 'تم تعديل هذا النص مرة أخرى بعد التعديل {id}، لذلك لا أستطيع التراجع تلقائيًا. تواصل مع أحمد.',
  notFromRequest: 'اكتب النص الجديد بالضبط كما تريده. أستخدم كلماتك أنت فقط ولا أضيف صياغة من عندي.',
  rejectTooLong: 'هذا النص أطول من اللازم لهذا المكان.',
  rejectMarkup: 'أستطيع تغيير النص العادي فقط (بدون وسوم أو رموز مثل < >).',
  rejectKind: 'هذه القيمة لا تبدو صحيحة (رقم هاتف أو بريد أو رابط https).',
  rejectEmpty: 'لا أستطيع حذف النص أو تركه فارغًا. اكتب النص الجديد.',
  rejectSame: 'هذا هو النص الحالي بالفعل.',
  rejectOther: 'لا أستطيع إجراء هذا التعديل. أستطيع تغيير النصوص فقط، وللتصميم تواصل مع أحمد.',
};
export const STATUS_AR = { pending: 'في انتظار الموافقة', applying: 'جارٍ النشر', live: 'منشور', rejected: 'ملغى', expired: 'انتهت مدته', reverted: 'تم التراجع', failed: 'لم يُنشر' };

export function t(key, vars = {}) {
  const s = M[key];
  if (!s) throw new Error('missing message ' + key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
export const REJECT_KEY = {
  too_long: 'rejectTooLong', bad_chars: 'rejectMarkup', markup: 'rejectMarkup', placeholder: 'rejectMarkup', kind: 'rejectKind',
  empty: 'rejectEmpty', same: 'rejectSame', not_from_request: 'notFromRequest', type: 'rejectOther',
};
