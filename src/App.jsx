import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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

  // Group parts into "single" (1 question) and "cluster" (multiple questions)
  const singleParts = [];
  const clusterParts = [];
  if (examData) {
    examData.forEach(part => {
      if ((part.questions || []).length > 1) {
        clusterParts.push(part);
      } else {
        singleParts.push(part);
      }
    });
  }

  // Build a running question counter
  let questionCounter = 0;

  return (
    <div className="app-container">
      {/* SIDEBAR CONTROLS (hidden when printing) */}
      <aside className={`no-print sidebar ${controlsCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">📝</span>
            {!controlsCollapsed && (
              <div className="logo-text">
                <h1>ĐGNL Renderer</h1>
                <p className="logo-subtitle">V-ACT Exam Generator</p>
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
                📋 JSON
              </button>
              <button
                className={`tab-btn ${activeTab === 'stats' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('stats'); setShowPromptView(false); }}
                disabled={!examData}
              >
                📊 Stats
              </button>
              <button
                className={`tab-btn ${activeTab === 'prompt' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('prompt'); loadPrompt(); }}
              >
                📜 Prompt
              </button>
            </div>

            {/* Tab: Input */}
            {activeTab === 'input' && (
              <div className="tab-content">
                <div className="input-header">
                  <span className="input-badge">{jsonLineCount} dòng</span>
                  <button className="btn-mini" onClick={loadSample} title="Tải JSON mẫu">📥 Mẫu</button>
                  <button className="btn-mini" onClick={() => fileInputRef.current?.click()} title="Nhập từ file">📂 File</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileImport}
                  />
                </div>
                <textarea
                  className="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='Dán JSON vào đây...'
                  rows={14}
                  spellCheck={false}
                />
                {error && <div className="error-message">⚠️ {error}</div>}

                <div className="action-buttons">
                  <button className="btn-primary" onClick={handleRender} disabled={!jsonInput.trim()}>
                    ⚡ Render
                  </button>
                  <button className="btn-outline" onClick={handlePrint} disabled={!examData}>
                    🖨️ In PDF
                  </button>
                  <button className="btn-ghost" onClick={handleClearAll} disabled={!jsonInput && !examData}>
                    🗑️ Xóa
                  </button>
                </div>

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
                  {Object.entries(stats.topicDist).map(([topic, count]) => (
                    <div key={topic} className="topic-row">
                      <span className="topic-name">{topic}</span>
                      <span className="topic-count">{count}</span>
                    </div>
                  ))}
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
          <div className="empty-state no-print">
            <div className="empty-icon">📄</div>
            <h2>Chưa có đề thi</h2>
            <p>Dán JSON vào ô bên trái và nhấn <strong>⚡ Render</strong> để xem trước đề thi.</p>
            <button className="btn-outline" onClick={() => { setActiveTab('prompt'); loadPrompt(); }} style={{marginTop: 16}}>
              📜 Xem Prompt v5.0
            </button>
          </div>
        )}

        {/* EXAM PAPER */}
        {examData && (
          <div className="exam-paper" ref={examPaperRef}>
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
              <div className="exam-section">
                {singleParts.map((part, index) => {
                  questionCounter++;
                  const q = part.questions[0];
                  const currentNum = questionCounter;

                  return (
                    <div key={index} className="question-block">
                      {/* Context */}
                      {part.context && part.context.trim() !== '' && (
                        <div className="exam-context">
                          <div className="context-content">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {part.context}
                            </ReactMarkdown>
                          </div>
                          {part.source && part.source.trim() !== '' && (
                            <div className="context-source">{part.source}</div>
                          )}
                        </div>
                      )}

                      <div className="question-content">
                        <strong>Câu {currentNum}:</strong>{' '}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{ p: 'span' }}
                        >
                          {q.content}
                        </ReactMarkdown>
                      </div>

                      <div className={`options-grid ${isLongOptions(q.options) ? 'options-single-col' : ''}`}>
                        {Object.entries(q.options || {}).map(([key, value]) => (
                          <div key={key} className={`option-item ${showAnswers && q.correctAnswer === key ? 'option-correct' : ''}`}>
                            <span className="option-label">{key}.</span>
                            <span className="option-text">
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ p: 'span' }}
                              >
                                {value}
                              </ReactMarkdown>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === PHẦN 2: CÂU HỎI CHÙM === */}
            {clusterParts.length > 0 && (
              <div className="exam-section">
                {clusterParts.map((part, pIndex) => {
                  const startNum = questionCounter + 1;
                  const endNum = questionCounter + part.questions.length;

                  return (
                    <div key={pIndex} className="cluster-block">
                      <div className="cluster-intro">
                        Dựa vào các thông tin được cung cấp dưới đây để trả lời các câu <strong>{startNum}</strong> đến <strong>{endNum}</strong>:
                      </div>

                      {part.context && part.context.trim() !== '' && (
                        <div className="exam-context cluster-context">
                          <div className="context-content">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {part.context}
                            </ReactMarkdown>
                          </div>
                          {part.source && part.source.trim() !== '' && (
                            <div className="context-source">{part.source}</div>
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
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={{ p: 'span' }}
                                >
                                  {q.content}
                                </ReactMarkdown>
                              </div>

                              <div className={`options-grid ${isLongOptions(q.options) ? 'options-single-col' : ''}`}>
                                {Object.entries(q.options || {}).map(([key, value]) => (
                                  <div key={key} className={`option-item ${showAnswers && q.correctAnswer === key ? 'option-correct' : ''}`}>
                                    <span className="option-label">{key}.</span>
                                    <span className="option-text">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{ p: 'span' }}
                                      >
                                        {value}
                                      </ReactMarkdown>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
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
        )}
      </main>
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
