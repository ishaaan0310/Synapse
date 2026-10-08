import React, { useCallback, useEffect, useRef, useState } from 'react';
import api, { getErrorMessage, openDocumentFile, toDateInput } from '../utils/api';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Charts';
import Icon from '../components/Icons';

const EMPTY_FORM = {
  title: '',
  category: 'academic',
  expiryDate: '',
  tags: ''
};

const CATEGORIES = [
  { value: 'academic', label: 'Academic', icon: 'academic' },
  { value: 'certificate', label: 'Certificate', icon: 'target' },
  { value: 'id', label: 'ID', icon: 'user' },
  { value: 'medical', label: 'Medical', icon: 'health' },
  { value: 'insurance', label: 'Insurance', icon: 'shield' },
  { value: 'other', label: 'Other', icon: 'documents' }
];

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
const MAX_SIZE = 10 * 1024 * 1024;

const getFileIcon = (type) => {
  switch (type) {
    case 'pdf': return 'file';
    case 'docx': return 'note';
    case 'jpg':
    case 'png': return 'image';
    default: return 'file';
  }
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'No expiry date';

const formatSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

const expiryState = (doc) => {
  if (!doc.expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((new Date(doc.expiryDate) - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: 'Expired', className: 'pill-danger' };
  if (days <= 30) return { text: days === 0 ? 'Expires today' : `Expires in ${days}d`, className: 'pill-warning' };
  return null;
};

// =====================================
// ONE DOCUMENT ROW
// =====================================

function DocumentItem({ doc, onUpdated, onDeleted }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const expiry = expiryState(doc);

  const open = async (download) => {
    try {
      await openDocumentFile(doc, { download });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not open file'));
    }
  };

  const startEdit = () => {
    setEditForm({
      title: doc.title,
      category: doc.category || 'other',
      tags: (doc.tags || []).join(', '),
      expiryDate: doc.expiryDate ? toDateInput(doc.expiryDate) : ''
    });
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      const response = await api.put(`/documents/${doc._id}`, editForm);
      onUpdated(response.data.document);
      setEditing(false);
      toast.success('Document updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update document'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${doc.title}"? The file will be permanently removed.`)) return;
    try {
      await api.delete(`/documents/${doc._id}`);
      onDeleted(doc._id);
      toast.success('Document deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete document'));
    }
  };

  if (editing) {
    return (
      <div className="entry">
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="full">Title
              <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
            </label>
            <label>Category
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label>Expiry date
              <input type="date" value={editForm.expiryDate}
                onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
            </label>
            <label className="full">Tags
              <input value={editForm.tags} placeholder="comma, separated"
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
            </label>
          </div>
          <div className="button-row">
            <button type="submit" className="btn small" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-secondary small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="entry doc-item">
      <div className={`doc-icon type-${doc.fileType}`}>
        <Icon name={getFileIcon(doc.fileType)} size={22} />
        <span>{doc.fileType === 'other' ? 'file' : doc.fileType}</span>
      </div>

      <div className="doc-body">
        <div className="doc-title-row">
          <strong className="doc-title">{doc.title}</strong>
          {expiry && <span className={`pill ${expiry.className}`}>{expiry.text}</span>}
        </div>

        <small className="muted">
          {doc.fileName} · {CATEGORIES.find((c) => c.value === doc.category)?.label || 'Other'} · Uploaded {formatDate(doc.uploadedAt)}
          {doc.expiryDate && ` · Expires ${formatDate(doc.expiryDate)}`}
        </small>

        {doc.tags?.length > 0 && (
          <div className="tags">
            {doc.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
          </div>
        )}
      </div>

      <div className="doc-actions">
        <button type="button" className="btn small" onClick={() => open(false)}>Open</button>
        <button type="button" className="icon-btn small" onClick={() => open(true)} title="Download" aria-label="Download"><Icon name="download" size={16} /></button>
        <button type="button" className="icon-btn small" onClick={startEdit} title="Edit" aria-label="Edit"><Icon name="edit" size={16} /></button>
        <button type="button" className="icon-btn small danger" onClick={remove} title="Delete" aria-label="Delete"><Icon name="trash" size={16} /></button>
      </div>
    </div>
  );
}

// =====================================
// PAGE
// =====================================

function Documents() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [documents, setDocuments] = useState([]);
  const [expiry, setExpiry] = useState({ expiringSoon: [], expired: [] });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // =====================================
  // FETCH (debounced when typing a search)
  // =====================================

  const fetchDocuments = useCallback(async (q, cat) => {
    try {
      setError('');
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (cat !== 'all') params.category = cat;

      const response = await api.get('/documents', { params });
      setDocuments(response.data);
    } catch (err) {
      console.error('Document fetch error:', err);
      setError(getErrorMessage(err, 'Unable to load documents'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExpiry = useCallback(async () => {
    try {
      const response = await api.get('/documents/expiry');
      setExpiry({
        expiringSoon: response.data.expiringSoon || [],
        expired: response.data.expired || []
      });
    } catch (err) {
      console.error('Expiry fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchDocuments(search, category), 300);
    return () => clearTimeout(timer);
  }, [search, category, fetchDocuments]);

  useEffect(() => {
    fetchExpiry();
  }, [fetchExpiry]);

  // =====================================
  // FILE PICKING
  // =====================================

  const pickFile = (picked) => {
    if (!picked) return;

    const ext = picked.name.slice(picked.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.split(',').includes(ext)) {
      setError('Only PDF, Word (.doc/.docx), JPG and PNG files are allowed.');
      return;
    }
    if (picked.size > MAX_SIZE) {
      setError('File is too large (max 10 MB).');
      return;
    }

    setError('');
    setFile(picked);
    if (!form.title) {
      setForm((f) => ({ ...f, title: picked.name.replace(/\.[^.]+$/, '') }));
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // =====================================
  // UPLOAD
  // =====================================

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
      formData.append('title', form.title || file.name);
      formData.append('category', form.category);
      formData.append('expiryDate', form.expiryDate);
      formData.append('tags', form.tags);

      await api.post('/documents/upload', formData);

      setFile(null);
      setForm(EMPTY_FORM);
      if (fileInputRef.current) fileInputRef.current.value = '';

      toast.success('Document uploaded');
      await Promise.all([fetchDocuments(search, category), fetchExpiry()]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(getErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploading(false);
    }
  };

  const handleUpdated = (updated) => {
    setDocuments((list) => list.map((d) => (d._id === updated._id ? updated : d)));
    fetchExpiry();
  };

  const handleDeleted = (id) => {
    setDocuments((list) => list.filter((d) => d._id !== id));
    fetchExpiry();
  };

  const attention = [...expiry.expired, ...expiry.expiringSoon];

  return (
    <div className="page mod-documents">
      <div className="page-header">
        <h2><span className="page-icon"><Icon name="documents" size={22} /></span>Document vault</h2>
      </div>

      {attention.length > 0 && (
        <div className="alert alert-warning">
          <Icon name="alert" size={18} />
          <span>
          <strong>Needs attention:</strong>{' '}
          {attention.slice(0, 3).map((d, i) => (
            <span key={d._id}>
              {i > 0 && ', '}
              "{d.title}" {new Date(d.expiryDate) < new Date() ? '(expired)' : `(expires ${formatDate(d.expiryDate)})`}
            </span>
          ))}
          {attention.length > 3 && ` and ${attention.length - 3} more`}
          </span>
        </div>
      )}

      {/* ============ UPLOAD ============ */}
      <div className="card">
        <h3>Upload a document</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleUpload}>
          <div
            className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => pickFile(e.target.files[0])}
            />
            {file ? (
              <p><Icon name="checkCircle" size={22} /><span><strong>{file.name}</strong> <span className="muted">({formatSize(file.size)}). Click to choose a different file.</span></span></p>
            ) : (
              <p><Icon name="upload" size={22} /><span><strong>Drop a file here or click to browse</strong><br /><small className="muted">PDF, Word, JPG or PNG up to 10 MB</small></span></p>
            )}
          </div>

          <div className="form-grid">
            <label className="full">Title
              <input type="text" name="title" placeholder="Document title" value={form.title} onChange={handleChange} maxLength="150" />
            </label>

            <label>Category
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>

            <label>Expiry date <span className="muted">(optional)</span>
              <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleChange} />
            </label>

            <label className="full">Tags
              <input type="text" name="tags" placeholder="e.g. college, marksheet" value={form.tags} onChange={handleChange} />
            </label>
          </div>

          <button type="submit" className="btn" disabled={uploading || !file}>
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </form>
      </div>

      {/* ============ LIST ============ */}
      <div className="card section">
        <div className="card-header">
          <h3>Your documents</h3>
          <span className="muted">{documents.length} item(s)</span>
        </div>

        <input
          type="search"
          placeholder="Search by title, file name or tag"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="chips">
          <button type="button" className={`chip ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" className={`chip ${category === c.value ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}>
              <Icon name={c.icon} size={15} /> {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton lines={4} />
        ) : documents.length === 0 ? (
          <div className="empty-state small">
            <Icon name="documents" size={32} className="empty-icon" />
            <p>{search || category !== 'all' ? 'No documents match your search.' : 'No documents yet. Upload your first one above.'}</p>
          </div>
        ) : (
          documents.map((doc) => (
            <DocumentItem key={doc._id} doc={doc} onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))
        )}
      </div>
    </div>
  );
}

export default Documents;
