import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Moon, Sun, UploadCloud, FileJson, Pencil, Edit3, RotateCcw } from 'lucide-react';

function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [examData, setExamData] = useState(null);
  const [error, setError] = useState('');
  const [examCode, setExamCode] = useState('');
  const [showAnswers, setShowAnswers] = useState(true);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'stats' | 'prompt'
  const [copySuccess, setCopySuccess] = useState(false);
  const [jsonLineCount, setJsonLineCount] = useState(0);
  const [promptContent, setPromptContent] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const [showPromptView, setShowPromptView] = useState(false);
  const [promptToc, setPromptToc] = useState([]);
  const examPaperRef = useRef(null);
  const fileInputRef = useRef(null);
  const promptBodyRef = useRef(null);
  const [isDarkModePaper, setIsDarkModePaper] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const pushUndo = (prevData) => {
    setUndoStack(s => {
      const next = [...s, JSON.parse(JSON.stringify(prevData))];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setExamData(prev);
    showToast('Đã hoàn tác (Undo)');
  };


  // ── Immutable update helpers for inline editing ──
  const updatePartField = useCallback((partIndex, field, newValue) => {
    setExamData(prev => {
      pushUndo(prev);
      const next = prev.map((p, i) => i === partIndex ? { ...p, [field]: newValue } : p);
      return next;
    });
  }, []);

  const updateQuestionField = useCallback((partIndex, questionIndex, field, newValue) => {
    setExamData(prev => {
      pushUndo(prev);
      return prev.map((p, i) => {
        if (i !== partIndex) return p;
        const newQuestions = p.questions.map((q, qi) =>
          qi === questionIndex ? { ...q, [field]: newValue } : q
        );
        return { ...p, questions: newQuestions };
      });
    });
  }, []);

  const updateOptionText = useCallback((partIndex, questionIndex, optionKey, newValue) => {
    setExamData(prev => {
      pushUndo(prev);
      return prev.map((p, i) => {
        if (i !== partIndex) return p;
        const newQuestions = p.questions.map((q, qi) => {
          if (qi !== questionIndex) return q;
          return { ...q, options: { ...q.options, [optionKey]: newValue } };
        });
        return { ...p, questions: newQuestions };
      });
    });
  }, []);

  const toggleCorrectAnswer = useCallback((partIndex, questionIndex, optionKey) => {
    setExamData(prev => {
      pushUndo(prev);
      return prev.map((p, i) => {
        if (i !== partIndex) return p;
        const newQuestions = p.questions.map((q, qi) =>
          qi === questionIndex ? { ...q, correctAnswer: optionKey } : q
        );
        return { ...p, questions: newQuestions };
      });
    });
    showToast(`Đã đổi đáp án đúng thành ${optionKey}`);
  }, []);

  const syncJsonFromExam = useCallback(() => {
    if (examData) {
      setJsonInput(JSON.stringify(examData, null, 2));
    }
  }, [examData]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setJsonInput(JSON.stringify(parsed, null, 2));
      } catch (e) {
        setJsonInput(event.target.result);
      }
      setActiveTab('input');
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    setJsonLineCount(jsonInput.split('\n').length);
  }, [jsonInput]);

  const handleRender = () => {
    try {
      const parsedData = JSON.parse(jsonInput);
      if (Array.isArray(parsedData)) {
        setExamData(parsedData);
        setError('');
        setExamCode(String(Math.floor(100 + Math.random() * 900)));
        setControlsCollapsed(true);
      } else {
        setError('Dữ liệu JSON không hợp lệ (Phải là một mảng Array).');
      }
    } catch (err) {
      setError('Lỗi khi parse JSON. Vui lòng kiểm tra lại cấu trúc.');
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonInput(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyAnswers = () => {
    if (!allQuestions.length) return;
    const text = allQuestions.map(q => `${q.globalId}. ${q.correctAnswer}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const loadPrompt = async () => {
    if (promptContent) { setShowPromptView(true); return; }
    setPromptLoading(true);
    try {
      const res = await fetch('/prompt.md');
      const text = await res.text();
      setPromptContent(text);
      // Extract TOC from major section headers (# I. ... or # V-bis. ...)
      const toc = [];
      text.split('\n').forEach((line, idx) => {
        const m1 = line.match(/^# ([IVXLC]+(?:-bis)?)\.\s*(.+)/i);
        const m2 = line.match(/^## (\d+\.\d+)\.?\s*(.+)/);
        if (m1) toc.push({ id: `toc-${idx}`, level: 1, num: m1[1], title: m1[2], line: idx });
        else if (m2) toc.push({ id: `toc-${idx}`, level: 2, num: m2[1], title: m2[2], line: idx });
      });
      setPromptToc(toc);
      setShowPromptView(true);
    } catch (err) {
      console.error('Failed to load prompt:', err);
    }
    setPromptLoading(false);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptContent);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  const promptWordCount = promptContent ? promptContent.split(/\s+/).length : 0;
  const promptLineCount = promptContent ? promptContent.split('\n').length : 0;

  const scrollToTocItem = (line) => {
    if (!promptBodyRef.current) return;
    const lineEl = document.getElementById(`prompt-line-${line.line}`);
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lineEl.classList.add('line-flash');
      setTimeout(() => lineEl.classList.remove('line-flash'), 1500);
    }
  };

  const handleClearAll = () => {
    setJsonInput('');
    setExamData(null);
    setError('');
    setExamCode('');
    setControlsCollapsed(false);
  };

  const loadSample = () => {
    const sample = [
      {
        "subject": "Tiếng Việt",
        "topic": "Đọc hiểu ngắn",
        "difficulty": "Thông hiểu",
        "context": "\"Thuở trời đất nổi cơn gió bụi\nKhách má hồng nhiều nỗi truân chuyên\nXanh kia thăm thẳm từng trên\nVì ai gây dựng cho nên nỗi này\"",
        "source": "(Đặng Trần Côn – Đoàn Thị Điểm, Chinh phụ ngâm)",
        "questions": [
          {
            "id": 1,
            "content": "Đoạn thơ được viết theo thể thơ nào?",
            "options": {
              "A": "Lục bát",
              "B": "Ngũ ngôn",
              "C": "Song thất lục bát",
              "D": "Tự do"
            },
            "correctAnswer": "C"
          }
        ]
      },
      {
        "subject": "Tiếng Việt",
        "topic": "Từ",
        "difficulty": "Nhận biết",
        "context": "",
        "source": "",
        "questions": [
          {
            "id": 2,
            "content": "Chọn từ viết đúng chính tả trong các từ sau:",
            "options": {
              "A": "Chất phát",
              "B": "Trau chuốt",
              "C": "Bàng hoàng",
              "D": "Lăng mạng"
            },
            "correctAnswer": "B"
          }
        ]
      },
      {
        "subject": "Tiếng Việt",
        "topic": "Đọc hiểu văn bản",
        "difficulty": "Vận dụng",
        "context": "\"Không ai muốn chết. Ngay cả những người muốn được lên thiên đường, cũng không muốn chết để tới đó. Nhưng Cái Chết là đích đến mà tất cả chúng ta đều phải tới. Chưa ai từng thoát khỏi nó. Và nên là như thế, bởi có lẽ Cái Chết là phát minh tuyệt vời nhất của Sự Sống. Nó là tác nhân thay đổi cuộc sống. Nó loại bỏ cái cũ để mở đường cho cái mới.\n\nThời gian của bạn có hạn nên đừng lãng phí thời gian sống cuộc đời của người khác. Đừng mắc kẹt trong những giáo điều, đó là sống chung với kết quả của những suy nghĩ của người khác. Điều quan trọng nhất là có can đảm để đi theo trái tim và trực giác của mình.\"",
        "source": "(Steve Jobs, Bài phát biểu tại Lễ Tốt nghiệp Stanford, 2005)",
        "questions": [
          {
            "id": 3,
            "content": "Phương thức biểu đạt chính của văn bản là:",
            "options": {
              "A": "Tự sự",
              "B": "Miêu tả",
              "C": "Nghị luận",
              "D": "Thuyết minh"
            },
            "correctAnswer": "C"
          },
          {
            "id": 4,
            "content": "Theo tác giả, cái gì là đích đến mà chúng ta đều phải tới?",
            "options": {
              "A": "Cái chết",
              "B": "Sự sống",
              "C": "Thành công",
              "D": "Trưởng thành"
            },
            "correctAnswer": "A"
          },
          {
            "id": 5,
            "content": "Chủ đề chính của đoạn văn là:",
            "options": {
              "A": "Cuộc sống là không chờ đợi",
              "B": "Cần sáng tạo không ngừng",
              "C": "Mọi thành công cần nỗ lực",
              "D": "Chấp nhận quy luật để tự đổi mới, sống là chính mình"
            },
            "correctAnswer": "D"
          }
        ]
      }
    ];
    setJsonInput(JSON.stringify(sample, null, 2));
  };

  // Collect all questions with global numbering
  const allQuestions = [];
  let globalIndex = 1;
  if (examData) {
    examData.forEach(part => {
      (part.questions || []).forEach(q => {
        allQuestions.push({ ...q, globalId: q.id || globalIndex, difficulty: part.difficulty, topic: part.topic });
        globalIndex++;
      });
    });
  }

  // Stats
  const stats = {
    total: allQuestions.length,
    nhanBiet: allQuestions.filter(q => q.difficulty === 'Nhận biết').length,
    thongHieu: allQuestions.filter(q => q.difficulty === 'Thông hiểu').length,
    vanDung: allQuestions.filter(q => q.difficulty === 'Vận dụng').length,
    vanDungCao: allQuestions.filter(q => q.difficulty === 'Vận dụng cao').length,
    answerDist: { A: 0, B: 0, C: 0, D: 0 },
    topicDist: {},
  };
  allQuestions.forEach(q => {
    if (stats.answerDist[q.correctAnswer] !== undefined) stats.answerDist[q.correctAnswer]++;
    stats.topicDist[q.topic] = (stats.topicDist[q.topic] || 0) + 1;
  });

  const radarData = Object.entries(stats.topicDist).map(([subject, count]) => ({
    subject, A: count, fullMark: Math.max(...Object.values(stats.topicDist)) + 2,
  }));

  // Group parts into "single" (1 question) and "cluster" (multiple questions)
  // IMPORTANT: _origIdx preserves the original index in examData[] for inline editing
  const singleParts = [];
  const clusterParts = [];
  if (examData) {
    examData.forEach((part, idx) => {
      if ((part.questions || []).length > 1) {
        clusterParts.push({ ...part, _origIdx: idx });
      } else {
        singleParts.push({ ...part, _origIdx: idx });
      }
    });
  }

  // Build a running question counter
  let questionCounter = 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR CONTROLS (hidden when printing) */}
      <aside className={`no-print sidebar ${controlsCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            {!controlsCollapsed && (
              <div className="logo-text">
                <h1>V-ACT Studio</h1>
                <p className="logo-subtitle">Exam Generator · v5.0</p>
              </div>
            )}
          </div>
          <button
            className="btn-collapse"
            onClick={() => setControlsCollapsed(!controlsCollapsed)}
            title={controlsCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {controlsCollapsed ? '»' : '«'}
          </button>
        </div>

        {!controlsCollapsed && (
          <div className="sidebar-body">
            {/* Tabs */}
            <div className="sidebar-tabs">
              <button
                className={`tab-btn ${activeTab === 'input' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('input'); setShowPromptView(false); }}
              >
                <span className="tab-icon">{ }</span> JSON
              </button>
              <button
                className={`tab-btn ${activeTab === 'stats' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('stats'); setShowPromptView(false); }}
                disabled={!examData}
              >
                <span className="tab-icon">📊</span> Stats
              </button>
              <button
                className={`tab-btn ${activeTab === 'prompt' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('prompt'); loadPrompt(); }}
              >
                <span className="tab-icon">⚙️</span> Prompt
              </button>
            </div>

            {/* Tab: Input */}
            {activeTab === 'input' && (
              <div className="tab-content">
                {/* Drop Zone */}
                <div 
                  className={`sidebar-dropzone ${isDragging ? 'dropzone-active' : ''} ${jsonInput.trim() ? 'dropzone-has-data' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {!jsonInput.trim() && !isDragging && (
                    <div className="dropzone-content">
                      <FileJson size={32} strokeWidth={1.5} />
                      <span className="dropzone-label">Kéo thả file .json vào đây</span>
                      <span className="dropzone-sublabel">hoặc dán trực tiếp bên dưới</span>
                    </div>
                  )}
                  {isDragging && (
                    <div className="dropzone-content dropzone-highlight">
                      <UploadCloud size={36} strokeWidth={1.5} />
                      <span className="dropzone-label">Thả file để tải lên</span>
                    </div>
                  )}
                  {jsonInput.trim() && !isDragging && (
                    <div className="dropzone-content dropzone-loaded">
                      <FileJson size={18} strokeWidth={2} />
                      <span className="dropzone-label">{jsonLineCount} dòng đã tải</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions Row */}
                <div className="input-header">
                  <button className="btn-chip" onClick={loadSample} title="Tải JSON mẫu">
                    <span>📥</span> Mẫu
                  </button>
                  <button className="btn-chip" onClick={() => fileInputRef.current?.click()} title="Nhập từ file">
                    <span>📂</span> File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileImport}
                  />
                  <div className="input-header-spacer" />
                  <span className="input-badge">{jsonLineCount} dòng</span>
                </div>

                {/* JSON Editor */}
                <div className="json-editor-wrap">
                  <textarea
                    className="json-input"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{ "subject": "Tiếng Việt", ... }'
                    spellCheck={false}
                  />
                </div>
                {error && <div className="error-message">⚠️ {error}</div>}

                {/* Actions */}
                <div className="action-buttons">
                  <button className="btn-primary" onClick={handleRender} disabled={!jsonInput.trim()}>
                    ⚡ Render đề thi
                  </button>
                  <button className="btn-outline" onClick={handlePrint} disabled={!examData}>
                    🖨️ PDF
                  </button>
                  <button className="btn-ghost" onClick={handleClearAll} disabled={!jsonInput && !examData}>
                    🗑️
                  </button>
                </div>

                {/* Toggle */}
                <div className="option-toggles">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showAnswers}
                      onChange={(e) => setShowAnswers(e.target.checked)}
                    />
                    <span className="toggle-switch"></span>
                    Hiện đáp án
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Stats */}
            {activeTab === 'stats' && examData && (
              <div className="tab-content">
                <div className="stats-grid">
                  <div className="stat-card stat-total">
                    <span className="stat-number">{stats.total}</span>
                    <span className="stat-label">Tổng câu</span>
                  </div>
                  <div className="stat-card stat-nb">
                    <span className="stat-number">{stats.nhanBiet}</span>
                    <span className="stat-label">Nhận biết</span>
                  </div>
                  <div className="stat-card stat-th">
                    <span className="stat-number">{stats.thongHieu}</span>
                    <span className="stat-label">Thông hiểu</span>
                  </div>
                  <div className="stat-card stat-vd">
                    <span className="stat-number">{stats.vanDung}</span>
                    <span className="stat-label">Vận dụng</span>
                  </div>
                  <div className="stat-card stat-vdc">
                    <span className="stat-number">{stats.vanDungCao}</span>
                    <span className="stat-label">VD Cao</span>
                  </div>
                </div>

                {/* Difficulty Bars */}
                <div className="stats-section">
                  <h3 className="stats-heading">Phân bố độ khó</h3>
                  {[
                    { label: 'Nhận biết', val: stats.nhanBiet, color: '#22c55e' },
                    { label: 'Thông hiểu', val: stats.thongHieu, color: '#3b82f6' },
                    { label: 'Vận dụng', val: stats.vanDung, color: '#f59e0b' },
                    { label: 'VD Cao', val: stats.vanDungCao, color: '#ef4444' },
                  ].map(d => (
                    <div key={d.label} className="bar-row">
                      <span className="bar-label">{d.label}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${stats.total ? (d.val / stats.total) * 100 : 0}%`,
                            background: d.color
                          }}
                        />
                      </div>
                      <span className="bar-value">{d.val} ({stats.total ? Math.round((d.val / stats.total) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>

                {/* Answer Distribution */}
                <div className="stats-section">
                  <h3 className="stats-heading">Phân bố đáp án</h3>
                  <div className="answer-dist">
                    {Object.entries(stats.answerDist).map(([k, v]) => (
                      <div key={k} className="answer-dist-item">
                        <span className="answer-dist-key">{k}</span>
                        <span className="answer-dist-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topic Distribution */}
                <div className="stats-section">
                  <h3 className="stats-heading">Phân bố chủ đề</h3>
                  <div className="radar-chart-container" style={{ width: '100%', height: 250, marginTop: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                        <Radar name="Số lượng" dataKey="A" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <button className="btn-outline btn-full" onClick={handleCopyAnswers}>
                  {copySuccess ? '✅ Đã copy!' : '📋 Copy đáp án'}
                </button>
              </div>
            )}

            {/* Tab: Prompt */}
            {activeTab === 'prompt' && (
              <div className="tab-content">
                {/* Header badges */}
                <div className="prompt-sidebar-badges">
                  <span className="prompt-badge prompt-badge-ver">v5.0</span>
                  <span className="prompt-badge">{promptWordCount.toLocaleString()} từ</span>
                  <span className="prompt-badge">{promptLineCount} dòng</span>
                </div>

                {/* Primary actions */}
                <button className="btn-primary btn-full" onClick={handleCopyPrompt}>
                  {promptCopied ? '✅ Đã copy!' : '📋 Copy toàn bộ Prompt'}
                </button>
                <button
                  className="btn-outline btn-full"
                  onClick={() => setShowPromptView(!showPromptView)}
                  style={{ marginTop: 6 }}
                >
                  {showPromptView ? '✕ Đóng xem trước' : '👁️ Xem trước'}
                </button>

                {/* TOC */}
                {promptToc.length > 0 && (
                  <div className="prompt-toc">
                    <div className="prompt-toc-title">Mục lục</div>
                    {promptToc.map(item => (
                      <div
                        key={item.id}
                        className={`toc-item toc-level-${item.level}`}
                        onClick={() => { setShowPromptView(true); setTimeout(() => scrollToTocItem(item), 150); }}
                      >
                        <span className="toc-num">{item.num}</span>
                        <span className="toc-text">{item.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className={`main-content ${controlsCollapsed ? 'main-expanded' : ''}`}>
        {/* Prompt Viewer - Full Page Premium */}
        {showPromptView && promptContent && (
          <div className="prompt-viewer no-print">
            {/* Floating toolbar */}
            <div className="prompt-toolbar">
              <div className="prompt-toolbar-left">
                <div className="prompt-toolbar-badge">PROMPT v5.0</div>
                <span className="prompt-toolbar-meta">{promptWordCount.toLocaleString()} từ · {promptLineCount} dòng</span>
              </div>
              <div className="prompt-toolbar-right">
                <input
                  className="prompt-search"
                  type="text"
                  placeholder="Tìm kiếm trong prompt..."
                  value={promptSearch}
                  onChange={(e) => setPromptSearch(e.target.value)}
                />
                <button className="prompt-toolbar-btn prompt-toolbar-copy" onClick={handleCopyPrompt}>
                  {promptCopied ? '✅ Copied!' : '📋 Copy All'}
                </button>
                <button className="prompt-toolbar-btn prompt-toolbar-close" onClick={() => setShowPromptView(false)}>
                  ✕
                </button>
              </div>
            </div>
            {/* High-Tech Raw Code Viewer */}
            <div className="prompt-code-container" ref={promptBodyRef}>
              <div className="prompt-code-inner">
                {promptContent.split('\n').map((lineText, idx) => {
                  const isMatch = promptSearch && lineText.toLowerCase().includes(promptSearch.toLowerCase());
                  const isHeader = lineText.startsWith('#');
                  return (
                    <div key={idx} id={`prompt-line-${idx}`} className={`prompt-code-line ${isMatch ? 'line-highlight' : ''}`}>
                      <div className="prompt-line-number">{idx + 1}</div>
                      <div className={`prompt-line-content ${isHeader ? 'line-is-header' : ''}`}>
                        {lineText || ' '}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!examData && !showPromptView && (
          <div 
            className={`empty-state no-print ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="empty-icon">
              {isDragging ? <UploadCloud size={64} color="var(--accent-light)" /> : <FileJson size={64} color="var(--text-muted)" opacity={0.5} />}
            </div>
            <h2>{isDragging ? 'Thả file JSON vào đây' : 'Chưa có đề thi'}</h2>
            <p>{isDragging ? 'Dữ liệu sẽ tự động được hiển thị.' : 'Dán JSON vào ô bên trái hoặc kéo thả file .json vào đây để xem trước đề thi.'}</p>
            <button className="btn-outline" onClick={() => { setActiveTab('prompt'); loadPrompt(); }} style={{marginTop: 16}}>
              📜 Xem Prompt v5.0
            </button>
          </div>
        )}

        {/* EXAM PAPER */}
        {examData && (
          <div className="exam-paper-container">

            <div className="exam-paper-actions no-print">
              <button 
                className={`btn-theme-toggle ${editMode ? 'active' : ''}`}
                onClick={() => {
                  if (editMode) {
                    syncJsonFromExam();
                    showToast('Đã lưu vào JSON');
                  }
                  setEditMode(!editMode);
                }}
                title={editMode ? 'Tắt chế độ chỉnh sửa' : 'Bật chế độ chỉnh sửa'}
              >
                {editMode ? <Edit3 size={16} /> : <Pencil size={16} />}
                <span>{editMode ? 'Thoát sửa' : 'Sửa đề'}</span>
              </button>
              <div style={{flex:1}} />
              <button 
                className={`btn-theme-toggle ${isDarkModePaper ? 'dark' : ''}`}
                onClick={() => setIsDarkModePaper(!isDarkModePaper)}
                title="Chuyển đổi giao diện sáng/tối"
              >
                {isDarkModePaper ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDarkModePaper ? 'Chế độ In' : 'Bảo vệ mắt'}</span>
              </button>
            </div>
            
            <div className={`exam-paper ${isDarkModePaper ? 'dark-mode' : ''} ${editMode ? 'edit-mode' : ''}`} ref={examPaperRef}>
            {/* === HEADER === */}
            <div className="exam-header">
              <div className="exam-header-left">
                <div className="header-org">ĐẠI HỌC QUỐC GIA TP.HCM</div>
                <div className="header-exam">KỲ THI ĐÁNH GIÁ NĂNG LỰC</div>
              </div>
              <div className="exam-header-right">
                <div className="header-label">ĐỀ THI MẪU</div>
                <div className="header-info">Mã đề: <strong>{examCode}</strong></div>
                <div className="header-info">Thời gian: <em>Theo quy định</em></div>
              </div>
            </div>

            <div className="exam-title-bar">
              <h2 className="exam-main-title">PHẦN SỬ DỤNG NGÔN NGỮ TIẾNG VIỆT</h2>
              <p className="exam-note">Thí sinh chọn đáp án đúng nhất cho mỗi câu hỏi dưới đây</p>
            </div>

            <hr className="exam-divider" />

            {/* === PHẦN 1: CÂU HỎI ĐƠN === */}
            {singleParts.length > 0 && (
              <motion.div className="exam-section" variants={containerVariants} initial="hidden" animate="show">
                {singleParts.map((part, index) => {
                  questionCounter++;
                  const q = part.questions[0];
                  const currentNum = questionCounter;
                  const pi = part._origIdx;

                  return (
                    <motion.div key={index} className="question-block" variants={itemVariants}>
                      {/* Context */}
                      {part.context && part.context.trim() !== '' && (
                        <div className="exam-context">
                          <div className="context-content">
                            <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updatePartField(pi, 'context', val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                
                              >
                                {part.context}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {part.source && part.source.trim() !== '' && (
                            <div className="context-source">
                              <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updatePartField(pi, 'source', val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {part.source}
                              </ReactMarkdown>
                            </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="question-content">
                        <strong>Câu {currentNum}:</strong>{' '}
                        <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updateQuestionField(pi, 0, 'content', val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {q.content}
                              </ReactMarkdown>
                            </div>
                      </div>

                      <div className={`options-grid ${isLongOptions(q.options) ? 'options-single-col' : ''}`}>
                        {Object.entries(q.options || {}).map(([key, value]) => (
                          <div
                            key={key}
                            className={`option-item ${showAnswers && q.correctAnswer === key ? 'option-correct' : ''} ${editMode ? 'option-editable-v2' : ''}`}
                            onClick={editMode ? (e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); toggleCorrectAnswer(pi, 0, key); } } : undefined}
                          >
                            <span className={`option-label ${editMode && q.correctAnswer === key ? 'option-label-correct' : ''}`}>{key}.</span>
                            <span className="option-text">
                              <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updateOptionText(pi, 0, key, val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {value}
                              </ReactMarkdown>
                            </div>
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* === PHẦN 2: CÂU HỎI CHÙM === */}
            {clusterParts.length > 0 && (
              <motion.div className="exam-section" variants={containerVariants} initial="hidden" animate="show">
                {clusterParts.map((part, pIndex) => {
                  const startNum = questionCounter + 1;
                  const endNum = questionCounter + part.questions.length;
                  const pi = part._origIdx;

                  return (
                    <motion.div key={pIndex} className="cluster-block" variants={itemVariants}>
                      <div className="cluster-intro">
                        Dựa vào các thông tin được cung cấp dưới đây để trả lời các câu <strong>{startNum}</strong> đến <strong>{endNum}</strong>:
                      </div>

                      {part.context && part.context.trim() !== '' && (
                        <div className="exam-context cluster-context">
                          <div className="context-content">
                            <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updatePartField(pi, 'context', val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                
                              >
                                {part.context}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {part.source && part.source.trim() !== '' && (
                            <div className="context-source">
                              <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updatePartField(pi, 'source', val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {part.source}
                              </ReactMarkdown>
                            </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="questions-container">
                        {part.questions.map((q, qIndex) => {
                          questionCounter++;
                          const currentNum = questionCounter;

                          return (
                            <div key={q.id || qIndex} className="question-block">
                              <div className="question-content">
                                <strong>Câu {currentNum}:</strong>{' '}
                                <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updateQuestionField(pi, qIndex, 'content', val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {q.content}
                              </ReactMarkdown>
                            </div>
                              </div>

                              <div className={`options-grid ${isLongOptions(q.options) ? 'options-single-col' : ''}`}>
                                {Object.entries(q.options || {}).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className={`option-item ${showAnswers && q.correctAnswer === key ? 'option-correct' : ''} ${editMode ? 'option-editable-v2' : ''}`}
                                    onClick={editMode ? (e) => { if (e.ctrlKey || e.metaKey) { e.stopPropagation(); toggleCorrectAnswer(pi, qIndex, key); } } : undefined}
                                  >
                                    <span className={`option-label ${editMode && q.correctAnswer === key ? 'option-label-correct' : ''}`}>{key}.</span>
                                    <span className="option-text">
                                      <div 
                              contentEditable={editMode} 
                              suppressContentEditableWarning={true} 
                              onBlur={(e) => (val_text) => updateOptionText(pi, qIndex, key, val_text)(e.target.innerText)}
                              className={`editable-content-v2 ${editMode ? 'is-editable' : ''}`}
                              onClick={editMode ? (e) => e.stopPropagation() : undefined}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {value}
                              </ReactMarkdown>
                            </div>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* === FOOTER === */}
            <div className="exam-footer">
              <div className="footer-line">— HẾT —</div>
              <div className="footer-note">Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.</div>
            </div>

            {/* === BẢNG ĐÁP ÁN === */}
            {showAnswers && allQuestions.length > 0 && (
              <div className="answer-key-section">
                <h2 className="answer-key-title">BẢNG ĐÁP ÁN</h2>
                <table className="answer-table">
                  <tbody>
                    {chunkArray(allQuestions, 10).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((q) => (
                          <td key={q.globalId} className="answer-cell">
                            <span className="answer-id">{q.globalId}.</span>
                            <span className="answer-value">{q.correctAnswer}</span>
                          </td>
                        ))}
                        {row.length < 10 && Array.from({ length: 10 - row.length }).map((_, i) => (
                          <td key={`empty-${i}`} className="answer-cell answer-cell-empty"></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}
      </main>
    
      {/* Floating Action Bar & Toast */}
      {editMode && (
        <div className="edit-fab no-print">
          <button className="btn-fab btn-fab-undo" onClick={handleUndo} disabled={undoStack.length === 0} title="Hoàn tác (Undo)">
            <RotateCcw size={18} />
            <span>Undo {undoStack.length > 0 ? `(${undoStack.length})` : ''}</span>
          </button>
          <button className="btn-fab btn-fab-save" onClick={() => { syncJsonFromExam(); showToast('Đã lưu vào JSON'); }} title="Đồng bộ JSON">
            <FileJson size={18} />
            <span>Lưu JSON</span>
          </button>
        </div>
      )}
      
      {toastMsg && (
        <div className="edit-toast no-print">
          {toastMsg}
        </div>
      )}
</div>
  );
}

// Helper: check if options are long
function isLongOptions(options) {
  if (!options) return false;
  return Object.values(options).some(v => v.length > 55);
}

// Helper: chunk array into rows of n
function chunkArray(arr, n) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += n) {
    chunks.push(arr.slice(i, i + n));
  }
  return chunks;
}

export default App;
