/* Presentation only; machine codes are preserved across locales. */
const MESSAGES={
  "en": {
    "PENDING": "Checking file locally before admission.",
    "BLOCKED": "File blocked. Correct the input or enter a new claim manually.",
    "READY": "File accepted. Inspect the source and reconfirm its mathematical field.",
    "REVIEW_REQUIRED": "File accepted for structural review only; extraction requires inspection.",
    "MANUAL": "Manual input; no file upload."
  },
  "es": {
    "PENDING": "Comprobando el archivo localmente antes de admitirlo.",
    "BLOCKED": "Archivo bloqueado. Corrija la entrada o escriba un nuevo enunciado.",
    "READY": "Archivo admitido. Revise la fuente y confirme de nuevo el campo matemático.",
    "REVIEW_REQUIRED": "Archivo admitido solo para revisión estructural; la extracción exige una inspección.",
    "MANUAL": "Entrada manual; sin carga de archivos."
  },
  "pt-BR": {
    "PENDING": "Verificando o arquivo localmente antes da admissão.",
    "BLOCKED": "Arquivo bloqueado. Corrija a entrada ou digite uma nova afirmação.",
    "READY": "Arquivo aceito. Revise a fonte e confirme novamente a área matemática.",
    "REVIEW_REQUIRED": "Arquivo aceito somente para revisão estrutural; a extração exige inspeção.",
    "MANUAL": "Entrada manual; sem upload de arquivo."
  },
  "fr": {
    "PENDING": "Contrôle local du fichier avant admission.",
    "BLOCKED": "Fichier bloqué. Corrigez la saisie ou entrez un nouvel énoncé.",
    "READY": "Fichier accepté. Vérifiez la source et reconfirmez le domaine mathématique.",
    "REVIEW_REQUIRED": "Fichier accepté uniquement pour un audit structurel ; extraction à examiner.",
    "MANUAL": "Saisie manuelle ; aucun fichier téléversé."
  },
  "de": {
    "PENDING": "Datei wird vor der Annahme lokal geprüft.",
    "BLOCKED": "Datei gesperrt. Eingabe korrigieren oder neue Aussage manuell eingeben.",
    "READY": "Datei akzeptiert. Quelle prüfen und mathematisches Fachgebiet erneut bestätigen.",
    "REVIEW_REQUIRED": "Datei nur für Strukturprüfung akzeptiert; Extraktion muss geprüft werden.",
    "MANUAL": "Manuelle Eingabe; keine Datei hochgeladen."
  },
  "zh-Hans": {
    "PENDING": "正在本地检查文件，尚未接收。",
    "BLOCKED": "文件已阻止。请更正输入或手动输入新命题。",
    "READY": "文件已接收。请检查源文本并重新确认数学领域。",
    "REVIEW_REQUIRED": "文件仅可用于结构审查；提取结果需要人工检查。",
    "MANUAL": "手动输入；未上传文件。"
  }
};
const REASONS={
  "INVALID_EXTENSION_OR_NAME": "Only safe .tex/.txt filenames are accepted.",
  "FILE_SIZE": "File must contain 1–65,536 bytes.",
  "FILE_READ_FAILED": "Unable to read the file.",
  "BYTE_COUNT_MISMATCH": "Declared file size does not match read bytes.",
  "INVALID_UTF8": "File is not valid UTF-8.",
  "EMPTY_SOURCE": "No source text was supplied.",
  "SOURCE_TOO_LARGE": "Decoded source exceeds the limit.",
  "CONTROL_CHARACTER": "Unsupported control character.",
  "BIDI_CONTROL": "Bidirectional text control is unsupported.",
  "UNSUPPORTED_EXACT_SOURCE": "Source has unsupported syntax or extraction warnings.",
  "NO_SUPPORTED_EQUATION": "No supported displayed equality was found.",
  "INVALID_METHOD": "Unsupported verification method.",
  "INTERNAL_PREFLIGHT_FAILURE": "Input could not be admitted."
};
export function preflightMessage(status,language,reason=''){
 const translated=MESSAGES[language]||MESSAGES.en;
 const diagnostic=reason?' '+reason+': '+(REASONS[reason]||REASONS.INTERNAL_PREFLIGHT_FAILURE):'';
 return 'SOURCE_PREFLIGHT_'+status+' — '+(translated[status]||MESSAGES.en[status]||'')+diagnostic;
}
