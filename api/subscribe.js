// 구독 API (Vercel Serverless Function)
// POST /api/subscribe  { email, website }  → Resend 연락처 추가 + 환영 메일 발송
//
// Vercel 환경 변수
//   RESEND_API_KEY     (필수) Resend API 키
//   MAIL_FROM          (필수) 보내는 주소. 예: 리마 <letter@내도메인.com>  (Resend에서 인증한 도메인이어야 함)
//   RESEND_SEGMENT_ID  (선택) 구독자를 넣을 Resend 세그먼트 ID
//   SITE_URL           (선택) 메일 속 홈페이지 링크. 기본값은 아래 DEFAULT_SITE

const DEFAULT_SITE = 'https://rimachieve.github.io/jibangdae-newsletter/';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function resend(path, body, extraHeaders = {}) {
  const r = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await r.json(); } catch (_) {}
  return { ok: r.ok, status: r.status, data };
}

function welcomeHtml(site) {
  return `
<div style="background:#F4F2EA;padding:32px 16px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#2C302A;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:18px;padding:32px 28px;">
    <p style="margin:0 0 6px;font-size:13px;color:#6B7C51;font-weight:700;">지방대생도 할 수 있다</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.4;">구독해 주셔서 고마워요 💌</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.75;">
      안녕하세요, 에디터 리마예요.<br>
      지방에서 맨땅에 헤딩하며 결국 길을 만든 사람들의 이야기를 모으고 있어요.
      새 인터뷰가 올라오면 이 메일로 가장 먼저 알려드릴게요.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.75;">
      그동안 올라온 이야기는 홈페이지에서 먼저 만나보세요.
    </p>
    <a href="${site}" style="display:inline-block;background:#454F34;color:#FBF9F1;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">인터뷰 보러 가기</a>
    <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#7A7F72;">
      인스타그램 @rimachieve · 구독을 원하지 않으시면 이 메일에 답장으로 알려주세요.
    </p>
  </div>
</div>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: '잘못된 요청이에요.' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    console.error('RESEND_API_KEY 또는 MAIL_FROM 환경 변수가 없습니다.');
    return res.status(500).json({ ok: false, message: '구독 기능을 준비 중이에요. 잠시 후 다시 시도해 주세요.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  // 스팸 봇 방지용 숨은 칸: 사람이면 비어 있음
  if (body.website) return res.status(200).json({ ok: true, message: '구독 완료!' });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, message: '이메일 주소를 다시 확인해 주세요.' });
  }

  const contact = { email, unsubscribed: false };
  if (process.env.RESEND_SEGMENT_ID) contact.segments = [{ id: process.env.RESEND_SEGMENT_ID }];

  const created = await resend('/contacts', contact);
  const already = !created.ok && (created.status === 409 ||
    /exist|already/i.test(JSON.stringify(created.data || '')));

  if (!created.ok && !already) {
    console.error('연락처 추가 실패', created.status, created.data);
    return res.status(502).json({ ok: false, message: '잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.' });
  }
  if (already) {
    return res.status(200).json({ ok: true, message: '이미 구독 중인 이메일이에요 :)' });
  }

  const site = process.env.SITE_URL || DEFAULT_SITE;
  const sent = await resend('/emails', {
    from: process.env.MAIL_FROM,
    to: email,
    subject: '💌 「지방대생도 할 수 있다」 구독을 환영해요',
    html: welcomeHtml(site),
  }, { 'Idempotency-Key': `welcome-${email}` });

  if (!sent.ok) {
    // 연락처는 저장됐으니 구독 자체는 성공으로 처리
    console.error('환영 메일 발송 실패', sent.status, sent.data);
  }

  return res.status(200).json({ ok: true, message: '구독 완료! 환영 메일을 보냈어요 💌' });
};
