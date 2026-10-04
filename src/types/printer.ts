export interface Printer {
  id: string;
  name: string;
  available: boolean;
}

export interface PrintJobResult {
  accepted: boolean;
  jobId?: string;
}

export interface PrinterService {
  listPrinters(): Promise<Printer[]>;
  print(printerId: string, pdfPath: string): Promise<PrintJobResult>;
}
