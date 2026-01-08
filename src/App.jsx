import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import createModule from '@neslinesli93/qpdf-wasm';
import './App.css';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

function App() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [progress, setProgress] = useState(0); // 0 to 100

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDownloadUrl('');
    setError('');
    setStatus('');
    setProgress(0);

    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0].errors[0];
      if (reason.code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.');
      } else if (reason.code === 'file-invalid-type') {
        setError('Please upload a PDF file.');
      } else {
        setError('Invalid file.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('File selected: ' + acceptedFiles[0].name);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const reset = () => {
    setFile(null);
    setPassword('');
    setStatus('');
    setError('');
    setDownloadUrl('');
    setProgress(0);
  };

  const handleDecrypt = async () => {
    if (!file) return;

    setError('');
    setDownloadUrl('');
    setProgress(10);

    try {
      setStatus('Initializing qpdf engine...');
      setProgress(20);

      const qpdf = await createModule({
        locateFile: () => '/qpdf.wasm',
      });

      setStatus('Loading PDF into memory...');
      setProgress(40);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      qpdf.FS.writeFile('/input.pdf', uint8Array);

      setStatus('Decrypting PDF...');
      setProgress(70);

      const args = ['--decrypt', '/input.pdf', '/output.pdf'];
      if (password) {
        args.unshift(`--password=${password}`);
      }

      qpdf.callMain(args);

      setStatus('Finalizing unlocked PDF...');
      setProgress(90);

      const outputData = qpdf.FS.readFile('/output.pdf');
      const blob = new Blob([outputData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus('Decryption successful! 🎉');
        } catch (err) {
      console.error(err);

      let userMessage = 'Decryption failed. Unknown error.';

      // Better detection of password-required or invalid password cases
      if (err.message?.toLowerCase().includes('password') ||
          err.message?.toLowerCase().includes('encrypt') ||
          err.name === 'ErrnoError' ||
          err.errno ||  // Emscripten-specific errno (e.g., 44)
          err.toString().toLowerCase().includes('password')) {
        userMessage = 'This PDF is password-protected. Please enter the correct password to open it and try again.';
      } else if (err.message) {
        userMessage = `Decryption failed: ${err.message}`;
      }

      setError(userMessage);
      setProgress(0);
      setStatus('');
    } finally {
      if (progress >= 90) {setProgress(0)};
    }
  };

  return (
    <div className="app">
      <div className='title'>
        <h1>PDF Decryptor</h1>
        <span>by Sawlew</span>
      </div>
      <p>Unlock restricted PDFs and remove known passwords — 100% in your browser.</p>

      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="file-info">
            <strong>Selected:</strong> {file.name}
            <br />
            <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
          </div>
        ) : isDragActive ? (
          <p>Drop the PDF here...</p>
        ) : (
          <p>Drag & drop a PDF here, or click to select</p>
        )}
      </div>

      {file && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault(); // Prevent page reload
              handleDecrypt();
            }}
          >
            <input
              type="password"
              placeholder="Password (if required to open the PDF)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
              autoFocus
            />
            <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
              Leave blank if the PDF opens normally but has restrictions (e.g., can't print).
            </small>

            <div className="actions">
              <button
                type='submit'
                className="primary">
                Decrypt PDF
              </button>
              <button
                type='button'
                onClick={reset}
                className="secondary">
                Clear
              </button>
            </div>
          </form>

          {(status || progress > 0) && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {status && <p className="status">{status}</p>}
            </div>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}

      {downloadUrl && (
        <div className="download">
          <a href={downloadUrl} download="unlocked.pdf" className="download-btn">
            Download Unlocked PDF
          </a>
        </div>
      )}

      <footer>Powered by qpdf</footer>
    </div>
  );
}

export default App;