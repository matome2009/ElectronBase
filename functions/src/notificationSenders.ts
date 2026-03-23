import * as nodemailer from 'nodemailer';

/**
 * メール設定（フロントエンドから渡される）
 */
export interface EmailSettings {
  emailSubject?: string;
  emailBody?: string;
  expiresInDays?: number;
  replyToEmail?: string;
  language?: string;
}

// Default email templates per language
const DEFAULT_SUBJECTS: Record<string, string> = {
  ja: 'KYC本人確認のお願い - ',
  en: 'KYC Verification Request - ',
  ko: 'KYC 본인확인 요청 - ',
  zh: 'KYC身份验证请求 - ',
};

const DEFAULT_BODIES: Record<string, (sessionName: string, kycLink: string, expiresInDays: number) => string> = {
  ja: (s, l, d) => [
    `${s} の支払いを受け取るために、本人確認（KYC）を完了してください。`,
    '', '以下のリンクからKYCフォームにアクセスし、MetaMaskでウォレット所有権を証明してください。',
    '', l, '', `このリンクの有効期限は${d}日間です。`,
  ].join('\n'),
  en: (s, l, d) => [
    `To receive payment from ${s}, please complete identity verification (KYC).`,
    '', 'Access the KYC form from the link below and verify wallet ownership with MetaMask.',
    '', l, '', `This link expires in ${d} days.`,
  ].join('\n'),
  ko: (s, l, d) => [
    `${s}의 결제를 받으려면 본인확인(KYC)을 완료해주세요.`,
    '', '아래 링크에서 KYC 양식에 접속하여 MetaMask로 지갑 소유권을 증명해주세요.',
    '', l, '', `이 링크의 유효기간은 ${d}일입니다.`,
  ].join('\n'),
  zh: (s, l, d) => [
    `为了接收${s}的付款，请完成身份验证（KYC）。`,
    '', '请通过以下链接访问KYC表单，使用MetaMask验证钱包所有权。',
    '', l, '', `此链接有效期为${d}天。`,
  ].join('\n'),
};

const DEFAULT_HTML_BODIES: Record<string, (sessionName: string, kycLink: string, expiresInDays: number) => string> = {
  ja: (s, l, d) => [
    `<p>${s} の支払いを受け取るために、本人確認（KYC）を完了してください。</p>`,
    '<p>以下のリンクからKYCフォームにアクセスし、MetaMaskでウォレット所有権を証明してください。</p>',
    `<p><a href="${l}">${l}</a></p>`,
    `<p>このリンクの有効期限は${d}日間です。</p>`,
  ].join('\n'),
  en: (s, l, d) => [
    `<p>To receive payment from ${s}, please complete identity verification (KYC).</p>`,
    '<p>Access the KYC form from the link below and verify wallet ownership with MetaMask.</p>',
    `<p><a href="${l}">${l}</a></p>`,
    `<p>This link expires in ${d} days.</p>`,
  ].join('\n'),
  ko: (s, l, d) => [
    `<p>${s}의 결제를 받으려면 본인확인(KYC)을 완료해주세요.</p>`,
    '<p>아래 링크에서 KYC 양식에 접속하여 MetaMask로 지갑 소유권을 증명해주세요.</p>',
    `<p><a href="${l}">${l}</a></p>`,
    `<p>이 링크의 유효기간은 ${d}일입니다.</p>`,
  ].join('\n'),
  zh: (s, l, d) => [
    `<p>为了接收${s}的付款，请完成身份验证（KYC）。</p>`,
    '<p>请通过以下链接访问KYC表单，使用MetaMask验证钱包所有权。</p>',
    `<p><a href="${l}">${l}</a></p>`,
    `<p>此链接有效期为${d}天。</p>`,
  ].join('\n'),
};

/**
 * 通知送信のStrategy Patternインターフェース
 * 将来的にSMS・Slack等に拡張可能
 */
export interface NotificationSender {
  send(to: string, kycLink: string, sessionName: string, emailSettings?: EmailSettings): Promise<boolean>;
}

/**
 * メール通知送信クラス（nodemailer使用）
 * SMTP設定は環境変数から取得
 */
export class EmailNotificationSender implements NotificationSender {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@example.com';
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async send(to: string, kycLink: string, sessionName: string, emailSettings?: EmailSettings): Promise<boolean> {
    const expiresInDays = emailSettings?.expiresInDays ?? 7;
    const lang = emailSettings?.language || 'ja';

    // 件名の組み立て
    const subject = emailSettings?.emailSubject
      ? emailSettings.emailSubject.replace(/\{sessionName\}/g, sessionName)
      : (DEFAULT_SUBJECTS[lang] || DEFAULT_SUBJECTS['ja']) + sessionName;

    // 本文の組み立て
    const getDefaultBody = DEFAULT_BODIES[lang] || DEFAULT_BODIES['ja'];
    const defaultBody = getDefaultBody(sessionName, kycLink, expiresInDays);

    const textBody = emailSettings?.emailBody
      ? emailSettings.emailBody
          .replace(/\{sessionName\}/g, sessionName)
          .replace(/\{kycLink\}/g, kycLink)
          .replace(/\{expiresInDays\}/g, String(expiresInDays))
      : defaultBody;

    // HTML本文の組み立て
    const getDefaultHtml = DEFAULT_HTML_BODIES[lang] || DEFAULT_HTML_BODIES['ja'];
    const defaultHtml = getDefaultHtml(sessionName, kycLink, expiresInDays);

    const htmlBody = emailSettings?.emailBody
      ? emailSettings.emailBody
          .replace(/\{sessionName\}/g, sessionName)
          .replace(/\{kycLink\}/g, `<a href="${kycLink}">${kycLink}</a>`)
          .replace(/\{expiresInDays\}/g, String(expiresInDays))
          .replace(/\n/g, '<br>')
      : defaultHtml;

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.from,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      };

      // Reply-To設定
      if (emailSettings?.replyToEmail) {
        mailOptions.replyTo = emailSettings.replyToEmail;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }
}

/**
 * 通知タイプに応じたNotificationSenderを返すファクトリ関数
 * 現在はemailのみ対応。将来的にsms/slackを追加可能。
 */
export function getNotificationSender(type: string): NotificationSender {
  switch (type) {
    case 'email':
      return new EmailNotificationSender();
    default:
      throw new Error(`Unsupported notification type: ${type}`);
  }
}
