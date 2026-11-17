// All user-facing wording. Arabic first (the client), English too (Ahmed's team).
export const hasArabic = (s) => /[؀-ۿ]/.test(s);
export function detectLang(s, fallback = 'ar') {
  const ar = (s.match(/[\u0600-\u06FF]/g) || []).length, en = (s.match(/[A-Za-z]/g) || []).length;
  return ar === 0 && en === 0 ? fallback : ar >= en ? 'ar' : 'en';
}

const M = {
  designRefused: {
    en: 'I can only change text; ask Ahmed for design changes.',
    ar: 'أستطيع تغيير النصوص فقط. للتعديلات على التصميم تواصل مع أحمد.',
  },
  textOnlyMedia: { en: 'Please send your request as a text message.', ar: 'من فضلك أرسل طلبك كرسالة نصية.' },
  slowDown: { en: 'Too many messages. Please wait a little and try again.', ar: 'رسائل كثيرة. من فضلك انتظر قليلًا ثم حاول مرة أخرى.' },
  busy: { en: 'Sorry, something went wrong. Nothing was changed. Please try again in a minute.', ar: 'عذرًا، حدث خطأ ولم يتم تغيير أي شيء. حاول مرة أخرى بعد دقيقة.' },
  help: {
    en: 'Send what you want changed, for example: "Change the slogan on the home page to ...". I only change text, never design. Only {client} can approve: reply YES <id>, NO <id>, or UNDO <id>.',
    ar: 'اكتب لي ما تريد تغييره، مثلًا: "غيّر الشعار في الصفحة الرئيسية إلى ...". أغيّر النصوص فقط وليس التصميم. الموافقة من {client} فقط: أرسل نعم <الرقم> أو لا <الرقم> أو تراجع <الرقم>.',
  },
  onlyClient: {
    en: 'Only {client} can approve or undo changes.',
    ar: 'الموافقة أو التراجع من {client} فقط.',
  },
  unknownChange: { en: 'I cannot find change {id}.', ar: 'لا أجد التعديل {id}.' },
  notPending: { en: 'Change {id} is no longer waiting (status: {status}).', ar: 'التعديل {id} لم يعد في الانتظار (الحالة: {status}).' },
  tooManyPending: { en: 'You already have {n} changes waiting. Please wait for an answer first.', ar: 'لديك {n} تعديلات في الانتظار. انتظر الرد عليها أولًا.' },
  notLive: { en: 'Change {id} is not live, so it cannot be undone.', ar: 'التعديل {id} ليس منشورًا، لذلك لا يمكن التراجع عنه.' },
  proposal: {
    en: 'Change {id}\n{lines}\nPreview: {preview}',
    ar: 'تعديل {id}\n{lines}\nمعاينة: {preview}',
  },
  askClientNow: { en: 'Reply YES {id} to publish, or NO {id} to cancel.', ar: 'للنشر أرسل: نعم {id} — للإلغاء أرسل: لا {id}' },
  sentToClient: { en: 'I sent this to {client} for approval. Nothing is live until {client} says YES.', ar: 'أرسلت التعديل إلى {client} للموافقة. لن يُنشر شيء قبل موافقته.' },
  approvalRequest: {
    en: '{requester} asks for this change:\n{lines}\nPreview: {preview}\nReply YES {id} to publish, or NO {id} to cancel. It expires in 24 hours.',
    ar: '{requester} يطلب هذا التعديل:\n{lines}\nمعاينة: {preview}\nللنشر أرسل: نعم {id} — للإلغاء أرسل: لا {id}\nينتهي الطلب بعد 24 ساعة.',
  },
  live: { en: 'Change {id} is approved. Live in about 1 minute.', ar: 'تمت الموافقة على التعديل {id}. سيظهر على الموقع خلال دقيقة تقريبًا.' },
  liveRequester: { en: '{client} approved change {id}. Live in about 1 minute.', ar: 'وافق {client} على التعديل {id}. سيظهر على الموقع خلال دقيقة تقريبًا.' },
  rejected: { en: 'Change {id} was cancelled. Nothing changed.', ar: 'تم إلغاء التعديل {id}. لم يتغير شيء.' },
  rejectedRequester: { en: 'Change {id} was cancelled by {who}.', ar: 'تم إلغاء التعديل {id} بواسطة {who}.' },
  expired: { en: 'Change {id} got no answer in 24 hours and was dropped.', ar: 'لم يتم الرد على التعديل {id} خلال 24 ساعة وتم إلغاؤه.' },
  stale: {
    en: 'The page changed since this request, so I cannot apply change {id}. Please send the request again.',
    ar: 'تغيّرت الصفحة منذ هذا الطلب، لذلك لا أستطيع تنفيذ التعديل {id}. أرسل الطلب مرة أخرى.',
  },
  undone: { en: 'Change {id} was undone. The old text is back in about 1 minute.', ar: 'تم التراجع عن التعديل {id}. سيعود النص القديم خلال دقيقة تقريبًا.' },
  undoStale: {
    en: 'The text of change {id} was edited again later, so I cannot undo it automatically. Ask Ahmed.',
    ar: 'تم تعديل نص التعديل {id} مرة أخرى بعد ذلك، لذلك لا أستطيع التراجع تلقائيًا. تواصل مع أحمد.',
  },
  notFromRequest: {
    en: 'Please write the exact new text you want. I only use your own words and never add new wording.',
    ar: 'من فضلك اكتب النص الجديد بالضبط كما تريده. أستخدم كلماتك أنت فقط ولا أضيف أي صياغة من عندي.',
  },
  rejectTooLong: { en: 'That text is too long for this place.', ar: 'هذا النص أطول من اللازم لهذا المكان.' },
  rejectMarkup: { en: 'I can only change plain text (no links in text, tags or symbols like < >).', ar: 'أستطيع تغيير النص العادي فقط (بدون وسوم أو رموز مثل < >).' },
  rejectKind: { en: 'That value does not look right (phone, email or https link).', ar: 'هذه القيمة لا تبدو صحيحة (رقم هاتف أو بريد أو رابط https).' },
  rejectEmpty: { en: 'I cannot delete text or leave it empty. Tell me the new text.', ar: 'لا أستطيع حذف النص أو تركه فارغًا. اكتب لي النص الجديد.' },
  rejectSame: { en: 'That is already the current text.', ar: 'هذا هو النص الحالي بالفعل.' },
  rejectOther: { en: 'I cannot make that change. I can only change text; ask Ahmed for design changes.', ar: 'لا أستطيع إجراء هذا التعديل. أستطيع تغيير النصوص فقط، وللتصميم تواصل مع أحمد.' },
};

export function t(key, lang, vars = {}) {
  const entry = M[key];
  if (!entry) throw new Error('missing message ' + key);
  return (entry[lang] || entry.en).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
export const REJECT_KEY = {
  too_long: 'rejectTooLong', bad_chars: 'rejectMarkup', markup: 'rejectMarkup', placeholder: 'rejectMarkup', kind: 'rejectKind',
  empty: 'rejectEmpty', same: 'rejectSame', not_from_request: 'notFromRequest', type: 'rejectOther',
};
