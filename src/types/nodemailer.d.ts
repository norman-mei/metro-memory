declare module 'nodemailer' {
  export interface TransportAuth {
    user?: string
    pass?: string
  }

  export interface TransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: TransportAuth
    [key: string]: unknown
  }

  export interface SendMailOptions {
    from?: string
    to: string
    subject: string
    text?: string
    html?: string
  }

  export interface Transporter<TReturn = unknown> {
    sendMail(options: SendMailOptions): Promise<TReturn>
  }

  export function createTransport(options: TransportOptions): Transporter

  const nodemailer: {
    createTransport: typeof createTransport
  }

  export default nodemailer
}
