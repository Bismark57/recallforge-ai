// Client-side text extraction for uploads. Everything stays in the browser.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

GlobalWorkerOptions.workerSrc = workerUrl

async function extractPdf(file) {
  const buf = await file.arrayBuffer()
  const pdf = await getDocument({ data: buf }).promise
  const parts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((it) => it.str).join(' '))
  }
  await pdf.destroy()
  return { text: parts.join('\n\n'), pages: pdf.numPages }
}

async function extractDocx(file) {
  const buf = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
  return { text: value, pages: null }
}

async function extractTextFile(file) {
  return { text: await file.text(), pages: null }
}

/** Returns { text, pages, kind } or throws with a friendly message. */
export async function extractFromFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return { ...(await extractPdf(file)), kind: 'PDF' }
  if (name.endsWith('.docx')) return { ...(await extractDocx(file)), kind: 'Word' }
  if (name.endsWith('.txt') || name.endsWith('.md'))
    return { ...(await extractTextFile(file)), kind: 'Text' }
  throw new Error(`Unsupported file type: ${file.name}. Use PDF, DOCX, TXT, or MD.`)
}

export const ACCEPT = '.pdf,.docx,.txt,.md'
