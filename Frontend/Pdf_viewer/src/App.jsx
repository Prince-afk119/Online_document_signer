import { useRef, useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

const API_URL = 'http://localhost:8000'

export default function App() {
  const canvasRef = useRef(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [clickPos, setClickPos] = useState(null)
  const [email, setEmail] = useState('')
  const [signature, setSignature] = useState('')
  const [status, setStatus] = useState('')
  const [viewport, setViewport] = useState(null)

  useEffect(() => {
    if (pdfDoc) renderPage(pageNum)
  }, [pdfDoc, pageNum])

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPdfFile(file)
    setClickPos(null)
    const arrayBuffer = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    setPdfDoc(doc)
    setTotalPages(doc.numPages)
    setPageNum(1)
    const formData = new FormData()
    formData.append('file', file)
    formData.append("email",email)
    try{
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData })}
    catch(error){
      console.error('Upload failed:', error)}
  }

  async function renderPage(num) {
    const page = await pdfDoc.getPage(num)
    const vp = page.getViewport({ scale: 1.5 })
    setViewport(vp)
    const canvas = canvasRef.current
    canvas.width = vp.width
    canvas.height = vp.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
  }

  function drawMarker(x, y) {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, 150, 50)
  }

  function handleCanvasClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setClickPos({ x, y })
    renderPage(pageNum).then(() => drawMarker(x, y))
  }

  async function handleSign() {
    if (!pdfFile || !clickPos || !email || !signature) {
      setStatus('Please fill in all fields, upload a PDF and click to place signature.')
      return
    }
    setStatus('Signing...')

    // Scale canvas coords to PDF coords
    const page = await pdfDoc.getPage(pageNum)
    const pdfViewport = page.getViewport({ scale: 1 })
    const scaleX = pdfViewport.width / viewport.width
    const scaleY = pdfViewport.height / viewport.height

    const formData = new FormData()
    formData.append('email', email)
    formData.append('signature', signature)
    formData.append('page', pageNum - 1)
    formData.append('x', clickPos.x * scaleX)
    formData.append('y', clickPos.y * scaleY)
    formData.append('file', pdfFile)

    const res = await fetch(`${API_URL}/sign`, { method: 'POST', body: formData })
    if (res.ok) {
      setStatus('Document signed and sent to your email!')
    } else {
      setStatus('Something went wrong.')
    }
  }

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px' }}>
      <div style={{ flex: 1 }}>
        <h2>Document Signer</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /><br /><br />
        <input type="text" placeholder="Type your signature" value={signature} onChange={e => setSignature(e.target.value)} /><br /><br />
        <input type="file" accept=".pdf" onChange={handleFileChange} /><br /><br />
        {totalPages > 1 && (
          <div>
            <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1}>◀</button>
            <span> Page {pageNum} of {totalPages} </span>
            <button onClick={() => setPageNum(p => Math.min(totalPages, p + 1))} disabled={pageNum === totalPages}>▶</button>
            <br /><br />
          </div>
        )}
        {clickPos && <p style={{ color: 'green' }}>✅ Signature placed at ({Math.round(clickPos.x)}, {Math.round(clickPos.y)})</p>}
        <button onClick={handleSign}>✍️ Sign & Send</button>
        {status && <p>{status}</p>}
      </div>
      <div>
        {pdfDoc && (
          <>
            <p style={{ color: 'gray' }}>Click on the document to place your signature</p>
            <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ cursor: 'crosshair', border: '1px solid #ccc' }} />
          </>
        )}
      </div>
    </div>
  )
}
