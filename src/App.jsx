import { useState } from 'react';
import createModule from '@neslinesli93/qpdf-wasm';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
    setStatus('');
  };

  const handleDecrypt = async () => {
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    setLoading(true);
    setStatus('Initializing qpdf...');
    setError('');

    try {
      // Load qpdf-wasm module
      // const qpdf = await createModule();

      setStatus('Reading PDF file...');
      const qpdf = await createModule({
        locateFile: () => '/qpdf.wasm'  // Adjust if you put it in a subfolder, e.g., '/wasm/qpdf.wasm'
      });
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Write input file to virtual filesystem
      qpdf.FS.writeFile('/input.pdf', uint8Array);

      // Build command arguments
      const args = ['--decrypt', '/input.pdf', '/output.pdf'];
      if (password) {
        args.unshift(`--password=${password}`);
      }

      setStatus('Decrypting PDF...');
      qpdf.callMain(args);

      // Read the output file
      const outputData = qpdf.FS.readFile('/output.pdf');
      const blob = new Blob([outputData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setStatus('Decryption successful! 🎉');
    } catch (err) {
      console.error(err);
      setError(`Decryption failed: ${err.message}`);
      if (err.message.includes('password')) {
        setError('Incorrect password or unsupported encryption.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>PDF Decryptor</h1>
      <p>Remove password protection and restrictions from PDFs — entirely in your browser.</p>

      <div className="card">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={loading}
        />
        
        <input
          type="password"
          placeholder="Password (if the PDF is password-protected)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          style={{ marginTop: '10px' }}
        />

        <button onClick={handleDecrypt} disabled={loading || !file}>
          {loading ? 'Processing...' : 'Decrypt PDF'}
        </button>
      </div>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      {downloadUrl && (
        <div className="download">
          <a href={downloadUrl} download="unlocked.pdf" className="download-btn">
            Download Unlocked PDF
          </a>
        </div>
      )}
    </div>
  );
}

export default App;