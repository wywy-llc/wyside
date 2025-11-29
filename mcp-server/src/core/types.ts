/**
 * Core型定義
 *
 * @remarks scaffold_featureツールで生成される機能のベース型定義
 */
export interface MedicalRecord {
  id: string;
  patientName?: string;
}
export interface TobiMail {
  /** source(ja): メールID */
  mailId?: string;
  /** source(ja): メールID枝番 */
  mailIdBranch?: string;
  /** source(ja): 件名 */
  subject?: string;
  /** source(ja): 受信日 */
  receivedDate?: string;
  /** source(ja): 確認者 */
  confirmer?: string;
  /** source(ja): ステータス */
  status?: string;
  /** source(ja): 分類 */
  category?: string;
  /** source(ja): メールアドレス */
  email?: string;
  /** source(ja): 広告媒体 */
  advertisingMedium?: string;
  /** source(ja): 初回希望日 */
  firstPreferredDate?: string;
  /** source(ja): 初回希望院 */
  firstPreferredClinic?: string;
  /** source(ja): 問い合わせ方法 */
  inquiryMethod?: string;
  /** source(ja): タグ */
  tags?: string;
  /** source(ja): 確認日 */
  confirmationDate?: string;
  /** source(ja): 不備なし／あり */
  defectStatus?: string;
  /** source(ja): 不備内容詳細 */
  defectDetails?: string;
  /** source(ja): 修正完了日 */
  correctionCompletedDate?: string;
  /** source(ja): 集計用 */
  forAggregation?: string;
}
