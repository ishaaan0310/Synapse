import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Documents() {
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    title: '',
    category: 'academic',
    expiryDate: '',
    tags: ''
  });

  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // ==========================================
  // FETCH DOCUMENTS
  // ==========================================

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/documents');

      setDocuments(response.data);

    } catch (err) {
      console.error('Document fetch error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to load documents'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // ==========================================
  // UPLOAD
  // ==========================================

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file first.');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();

      formData.append('file', file);
      formData.append(
        'title',
        form.title || file.name
      );
      formData.append(
        'category',
        form.category
      );
      formData.append(
        'expiryDate',
        form.expiryDate
      );
      formData.append(
        'tags',
        form.tags
      );

      await api.post(
        '/documents/upload',
        formData
      );

      // Reset form
      setFile(null);

      setForm({
        title: '',
        category: 'academic',
        expiryDate: '',
        tags: ''
      });

      // Reset file input
      document.getElementById('document-file').value = '';

      // Refresh documents
      await fetchDocuments();

    } catch (err) {
      console.error('Upload error:', err);

      setError(
        err.response?.data?.message ||
        'Failed to upload document'
      );
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const handleSearch = async (e) => {
    const value = e.target.value;

    setSearch(value);

    try {
      const response = await api.get(
        `/documents/search?q=${encodeURIComponent(value)}`
      );

      setDocuments(response.data);

    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // ==========================================
  // FILE ICON
  // ==========================================

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf':
        return '📕';

      case 'docx':
        return '📘';

      case 'jpg':
      case 'png':
        return '🖼️';

      default:
        return '📄';
    }
  };

  // ==========================================
  // DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return 'No expiry date';

    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  // ==========================================
  // FILE URL
  // ==========================================

  const getFileUrl = (fileUrl) => {
    return `http://localhost:5000${fileUrl}`;
  };

  return (
    <div className="page">

      <h2>Document Vault</h2>

      {/* ======================================
          UPLOAD
      ======================================= */}

      <div className="card">

        <h3>Upload Document</h3>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload}>

          <input
            type="text"
            name="title"
            placeholder="Document title"
            value={form.title}
            onChange={handleChange}
          />

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            <option value="academic">
              Academic
            </option>

            <option value="certificate">
              Certificate
            </option>

            <option value="id">
              ID
            </option>

            <option value="medical">
              Medical
            </option>

            <option value="insurance">
              Insurance
            </option>

            <option value="other">
              Other
            </option>
          </select>

          <input
            type="date"
            name="expiryDate"
            value={form.expiryDate}
            onChange={handleChange}
          />

          <input
            type="text"
            name="tags"
            placeholder="Tags (example: college, marksheet)"
            value={form.tags}
            onChange={handleChange}
          />

          <input
            id="document-file"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) =>
              setFile(e.target.files[0])
            }
            required
          />

          {file && (
            <p>
              Selected: <strong>{file.name}</strong>
            </p>
          )}

          <button
            type="submit"
            className="btn"
            disabled={uploading}
          >
            {uploading
              ? 'Uploading...'
              : 'Upload Document'}
          </button>

        </form>

      </div>

      {/* ======================================
          SEARCH
      ======================================= */}

      <div className="card">

        <h3>Your Documents</h3>

        <input
          type="text"
          placeholder="🔍 Search documents..."
          value={search}
          onChange={handleSearch}
        />

        {loading ? (
          <p>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p>
            No documents found. Upload your first
            document above.
          </p>
        ) : (

          <div>

            {documents.map((doc) => (

              <div
                key={doc._id}
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: '12px',
                  background: '#f7f7ff',
                  border: '1px solid #e5e5e5'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >

                  <div>

                    <h3
                      style={{
                        margin: '0 0 0.4rem'
                      }}
                    >
                      {getFileIcon(doc.fileType)}{' '}
                      {doc.title}
                    </h3>

                    <p>
                      {doc.fileName}
                    </p>

                    <small>
                      Category:{' '}
                      <strong>
                        {doc.category}
                      </strong>
                    </small>

                    <br />

                    <small>
                      Uploaded:{' '}
                      {formatDate(
                        doc.uploadedAt
                      )}
                    </small>

                    {doc.expiryDate && (
                      <>
                        <br />

                        <small>
                          Expires:{' '}
                          <strong>
                            {formatDate(
                              doc.expiryDate
                            )}
                          </strong>
                        </small>
                      </>
                    )}

                  </div>

                  <a
                    href={getFileUrl(doc.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Open
                  </a>

                </div>

                {doc.tags &&
                  doc.tags.length > 0 && (
                    <div
                      style={{
                        marginTop: '0.75rem'
                      }}
                    >
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display:
                              'inline-block',
                            padding:
                              '0.3rem 0.6rem',
                            marginRight:
                              '0.4rem',
                            borderRadius:
                              '20px',
                            background:
                              '#e8e8ff'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

export default Documents;