class ChatExtension {
  constructor() {
    this.chatVisible = false;
    this.messages = [];
    this.username = 'Пользователь';
    this.lastMessage = '';
    this.messageReceived = false;
    this.chatContainer = null;
    this.chatMessages = null;
    this.messageInput = null;
    this.isDarkTheme = this.detectTheme();
    this.selectedImage = null;
    this.lastImageDataURL = '';
    this.contextMenu = null;

    // Для режима редактирования
    this.editingMessageId = null;
    this.originalMessageText = '';
    this.editingMessageIndex = null;

    // Флаги для LaTeX
    this.katexLoaded = false;
    this.autoRenderLoaded = false;

    // Новое свойство для названия чата
    this.chatTitle = 'Чат';

    // Загружаем библиотеки для Markdown и LaTeX
    this.loadExternalLibraries();

    // Создаём интерфейс чата
    this.createChatInterface();
  }

  // Структура расширения Scratch
  getInfo() {
    return {
      id: 'chatextension',
      name: 'Чат',
      color1: '#fe3636',
      color2: '#e02d2d',
      blocks: [
        {
          opcode: 'showChat',
          blockType: Scratch.BlockType.COMMAND,
          text: 'показать чат'
        },
        {
          opcode: 'hideChat',
          blockType: Scratch.BlockType.COMMAND,
          text: 'скрыть чат'
        },
        {
          opcode: 'sendMessage',
          blockType: Scratch.BlockType.COMMAND,
          text: 'отправить сообщение [MESSAGE]',
          arguments: {
            MESSAGE: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'Привет!'
            }
          }
        },
        {
          opcode: 'sendAIMessage',
          blockType: Scratch.BlockType.COMMAND,
          text: 'отправить сообщение от ИИ [MESSAGE]',
          arguments: {
            MESSAGE: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'Привет от ИИ!'
            }
          }
        },
        {
          opcode: 'sendMessageWithImage',
          blockType: Scratch.BlockType.COMMAND,
          text: 'отправить сообщение [MESSAGE] с изображением [IMAGE_URL]',
          arguments: {
            MESSAGE: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'Смотри это изображение!'
            },
            IMAGE_URL: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'data:image/png;base64,...'
            }
          }
        },
        {
          opcode: 'whenMessageSent',
          blockType: Scratch.BlockType.HAT,
          text: 'когда пользователь отправил сообщение'
        },
        {
          opcode: 'getLastMessage',
          blockType: Scratch.BlockType.REPORTER,
          text: 'последнее сообщение пользователя'
        },
        {
          opcode: 'getLastImageDataURL',
          blockType: Scratch.BlockType.REPORTER,
          text: 'последнее изображение (data URL)'
        },
        {
          opcode: 'setUsername',
          blockType: Scratch.BlockType.COMMAND,
          text: 'установить имя пользователя [NAME]',
          arguments: {
            NAME: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'Пользователь'
            }
          }
        },
        {
          opcode: 'getUsername',
          blockType: Scratch.BlockType.REPORTER,
          text: 'имя пользователя'
        },
        {
          opcode: 'exportChat',
          blockType: Scratch.BlockType.REPORTER,
          text: 'экспортировать чат'
        },
        {
          opcode: 'importChat',
          blockType: Scratch.BlockType.COMMAND,
          text: 'импортировать чат [DATA]',
          arguments: {
            DATA: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: ''
            }
          }
        },
        {
          opcode: 'clearChat',
          blockType: Scratch.BlockType.COMMAND,
          text: 'очистить чат'
        },
        // Новые блоки для названия чата
        {
          opcode: 'setChatTitle',
          blockType: Scratch.BlockType.COMMAND,
          text: 'установить название чата [TITLE]',
          arguments: {
            TITLE: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'Мой чат'
            }
          }
        },
        {
          opcode: 'getChatTitle',
          blockType: Scratch.BlockType.REPORTER,
          text: 'название чата'
        }
      ]
    };
  }

  // ---------------- Загрузка внешних библиотек ----------------
  loadExternalLibraries() {
    // marked для Markdown
    if (!window.marked) {
      const markedScript = document.createElement('script');
      markedScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js';
      markedScript.onload = () => console.log('marked loaded');
      markedScript.onerror = () => console.error('Failed to load marked');
      document.head.appendChild(markedScript);
    }
    // KaTeX
    if (!window.katex) {
      // CSS KaTeX
      const katexCSS = document.createElement('link');
      katexCSS.rel = 'stylesheet';
      katexCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css';
      katexCSS.onload = () => console.log('KaTeX CSS loaded');
      katexCSS.onerror = () => console.error('Failed to load KaTeX CSS');
      document.head.appendChild(katexCSS);
      // JS KaTeX
      const katexScript = document.createElement('script');
      katexScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js';
      katexScript.onload = () => {
        console.log('KaTeX JS loaded');
        this.katexLoaded = true;
      };
      katexScript.onerror = () => console.error('Failed to load KaTeX JS');
      document.head.appendChild(katexScript);
      // auto-render
      const katexAutoRender = document.createElement('script');
      katexAutoRender.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/contrib/auto-render.min.js';
      katexAutoRender.onload = () => {
        console.log('KaTeX auto-render loaded');
        this.autoRenderLoaded = true;
        // Рендерим уже добавленные AI-сообщения
        this.renderAllPendingLatex();
      };
      katexAutoRender.onerror = () => console.error('Failed to load KaTeX auto-render');
      document.head.appendChild(katexAutoRender);
    } else {
      this.katexLoaded = true;
      if (window.renderMathInElement) {
        this.autoRenderLoaded = true;
      }
    }

    // Стили для Markdown, сглаживания и меню
    if (!document.getElementById('markdownStyles')) {
      const styles = document.createElement('style');
      styles.id = 'markdownStyles';
      styles.textContent = `
        /* Markdown */
        .markdown-content table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        .markdown-content table th, .markdown-content table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .markdown-content table th { background-color: #f2f2f2; font-weight: bold; }
        .markdown-content blockquote { border-left: 4px solid #fe3636; margin: 10px 0; padding-left: 15px; font-style: italic; }
        .markdown-content code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        .markdown-content pre { background-color: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; }
        .markdown-content pre code { background: none; padding: 0; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3,
        .markdown-content h4, .markdown-content h5, .markdown-content h6 { margin: 15px 0 10px 0; }
        .markdown-content ul, .markdown-content ol { margin: 10px 0; padding-left: 20px; }

        /* Сглаживание текста */
        .chat-message .message-text, .chat-message .markdown-content {
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        /* Контекстное меню - увеличенные размеры и скругления */
        .chat-context-menu {
          position: fixed;
          background: ${this.isDarkTheme ? '#3d3d3d' : '#ffffff'};
          border: 1px solid ${this.isDarkTheme ? '#5d5d5d' : '#d7d7d2'};
          border-radius: 24px; /* Увеличено */
          box-shadow: 0 6px 16px rgba(0,0,0,0.25); /* Увеличена тень */
          z-index: 10001;
          padding: 20px 0; /* Увеличено */
          min-width: 280px; /* Немного увеличено */
          font-size: 18px;
        }
        .chat-context-menu-item {
          padding: 20px 28px;
          cursor: pointer;
          color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 16px; /* Добавлено мягкое скругление при наведении */
        }
        .chat-context-menu-item:hover {
          background: ${this.isDarkTheme ? '#4d4d4d' : '#f0f0f0'};
        }

        /* Меню заголовка */
        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: ${this.isDarkTheme ? '#3d3d3d' : '#ffffff'};
          border: 1px solid ${this.isDarkTheme ? '#5d5d5d' : '#d7d7d2'};
          border-radius: 20px; /* Увеличено */
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 10001;
          padding: 18px 0;
          min-width: 240px;
          font-size: 16px;
          display: none;
        }
        .dropdown-menu-item {
          padding: 18px 24px;
          cursor: pointer;
          color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 12px;
        }
        .dropdown-menu-item:hover {
          background: ${this.isDarkTheme ? '#4d4d4d' : '#f0f0f0'};
        }

        /* Меню фото */
        .photo-options-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: ${this.isDarkTheme ? '#3d3d3d' : '#ffffff'};
          border: 1px solid ${this.isDarkTheme ? '#5d5d5d' : '#d7d7d2'};
          border-radius: 20px; /* Увеличено */
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 10001;
          padding: 18px 0;
          min-width: 220px;
          font-size: 16px;
          display: none;
        }
        .photo-options-item {
          padding: 18px 24px;
          cursor: pointer;
          color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 12px;
        }
        .photo-options-item:hover {
          background: ${this.isDarkTheme ? '#4d4d4d' : '#f0f0f0'};
        }

        /* Меню математики */
        .math-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: ${this.isDarkTheme ? '#3d3d3d' : '#ffffff'};
          border: 1px solid ${this.isDarkTheme ? '#5d5d5d' : '#d7d7d2'};
          border-radius: 24px; /* Увеличено */
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 10001;
          padding: 18px 0;
          min-width: 220px;
          font-size: 16px;
          display: none;
        }
        .math-menu-section {
          padding: 10px 24px;
          font-weight: bold;
          color: ${this.isDarkTheme ? '#cccccc' : '#666666'};
          font-size: 14px;
        }
        .math-menu-item {
          padding: 18px 24px;
          cursor: pointer;
          color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 12px;
        }
        .math-menu-item:hover {
          background: ${this.isDarkTheme ? '#4d4d4d' : '#f0f0f0'};
        }
        .math-menu-item.selected {
          background: ${this.isDarkTheme ? '#fe3636' : '#ffe6e6'};
          color: ${this.isDarkTheme ? '#ffffff' : '#fe3636'};
        }

        /* Баннер редактирования */
        #editBanner {
          background: ${this.isDarkTheme ? '#444444' : '#f0f0f0'};
          color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
          padding: 14px 18px; /* Изменено */
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 16px; /* Увеличено */
          margin: 0 24px 10px 24px; /* Немного увеличены отступы */
          font-size: 16px;
          border-left: 4px solid #fe3636;
        }
        #editBanner span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 8px;
        }
        #editBanner button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
          color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
        }

        /* Сообщения и скругления */
        .chat-message .message-text {
          border-radius: 16px;
        }
        /* Но мы задаём округления в JS при создании контейнеров */
      `;
      document.head.appendChild(styles);
    }
  }

  // ---------------- Определение темы ----------------
  detectTheme() {
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    const bgColor = computedStyle.backgroundColor;
    if (bgColor.includes('rgb')) {
      const rgb = bgColor.match(/\d+/g);
      const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
      return brightness < 128;
    }
    return false;
  }

  // ---------------- Создание интерфейса ----------------
  createChatInterface() {
    this.chatContainer = document.createElement('div');
    this.chatContainer.id = 'scratchChatContainer';
    this.chatContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${this.isDarkTheme ? '#2d2d2d' : '#f7f7f2'};
      z-index: 10000;
      display: none;
      flex-direction: column;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      zoom: 2;
    `;

    // Заголовок с динамическим названием
    const chatHeader = document.createElement('div');
    chatHeader.style.cssText = `
      background-color: ${this.isDarkTheme ? '#2d2d2d' : '#f7f7f2'};
      color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
      padding: 20px;
      font-size: 28px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid ${this.isDarkTheme ? '#4d4d4d' : '#d7d7d2'};
      position: relative;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    `;
    chatHeader.innerHTML = `
      <button id="closeChatBtn" style="
        background: none;
        border: none;
        color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        font-weight: normal;
        border-radius: 12px;
      ">Назад</button>
      <span style="color: #fe3636;" id="chatTitleSpan">${this.chatTitle}</span>
      <div style="position: relative;">
        <button id="menuBtn" style="
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          width: 32px;
          height: 32px;
          border-radius: 12px;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}">
            <g transform="translate(24) rotate(90)">
              <circle cx="6" cy="12" r="2" fill="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}"/>
              <circle cx="12" cy="12" r="2" fill="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}"/>
              <circle cx="18" cy="12" r="2" fill="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}"/>
            </g>
          </svg>
        </button>
        <div id="headerDropdownMenu" class="dropdown-menu"></div>
      </div>
    `;

    // Создаём содержимое меню заголовка
    const headerDropdownMenu = chatHeader.querySelector('#headerDropdownMenu');
    if (headerDropdownMenu) {
      headerDropdownMenu.innerHTML = `
        <div class="dropdown-menu-item" id="renameChatBtnMenu">✏️ Переименовать чат</div>
        <div class="dropdown-menu-item" id="clearChatBtnMenu">🗑️ Очистить чат</div>
        <div class="dropdown-menu-item" id="deleteAndCloseBtnMenu">🚫 Удалить</div>
        <div class="dropdown-menu-item" id="shareChatBtnMenu">📤 Поделиться чатом</div>
      `;
    }

    // Область сообщений
    this.chatMessages = document.createElement('div');
    this.chatMessages.id = 'chatMessages';
    this.chatMessages.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
      font-size: 18px;
    `;

    // Превью изображения над input-bar
    const imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.id = 'imagePreviewContainer';
    imagePreviewContainer.style.cssText = `
      display: none;
      padding: 15px 20px 0 20px;
    `;

    // Панель ввода и баннер редактирования
    const inputAreaContainer = document.createElement('div');
    inputAreaContainer.id = 'inputAreaContainer';
    inputAreaContainer.style.cssText = `
      display: flex;
      flex-direction: column;
    `;
    // Баннер
    const editBanner = document.createElement('div');
    editBanner.id = 'editBanner';
    editBanner.style.display = 'none';
    inputAreaContainer.appendChild(editBanner);

    // ---------------- Изменённая часть: inputPanel ----------------
    const inputPanel = document.createElement('div');
    inputPanel.style.cssText = `
      padding: 15px 20px 40px 20px;
      background-color: transparent;
      position: relative;
      margin-bottom: -25px;
    `;

    // ---------------- Изменённая часть: inputContainer ----------------
    const inputContainer = document.createElement('div');
    inputContainer.id = 'inputContainer';
    inputContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      background-color: ${this.isDarkTheme ? '#3d3d3d' : '#ffffff'};
      border: 2px solid ${this.isDarkTheme ? '#5d5d5d' : '#d7d7d2'};
      border-radius: 30px; /* Увеличено скругление */
      padding: 15px;
      min-height: 80px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: border-radius 0.2s ease;
    `;

    // Скрытые input для изображений
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'imageFileInput';

    const cameraInput = document.createElement('input');
    cameraInput.type = 'file';
    cameraInput.accept = 'image/*';
    cameraInput.capture = 'environment';
    cameraInput.style.display = 'none';
    cameraInput.id = 'cameraInput';

    // ---------------- Кнопка фото с заменённым SVG ----------------
    const photoButtonContainer = document.createElement('div');
    photoButtonContainer.style.cssText = `
      position: relative;
      flex-shrink: 0;
    `;
    const photoButton = document.createElement('button');
    photoButton.id = 'photoButton';
    photoButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      margin-right: 8px;
      display: flex;
      align-items: center;
      border-radius: 50%;
      transition: background-color 0.2s;
      flex-shrink: 0;
    `;
    photoButton.innerHTML = `
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="22.75835" height="22.77194" viewBox="0,0,22.75835,22.77194"><g transform="translate(-228.62083,-168.61403)"><g fill="none" stroke="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}" stroke-width="3.875" stroke-miterlimit="10"><g><path d="M228.62083,180h22.75835z"/><path d="M239.95966,191.3791l0.08068,-22.7582z"/></g></g></g></svg>
    `;
    const photoOptionsMenu = document.createElement('div');
    photoOptionsMenu.id = 'photoOptionsMenu';
    photoOptionsMenu.className = 'photo-options-menu';
    photoOptionsMenu.innerHTML = `
      <div class="photo-options-item" data-action="camera">📷 Камера</div>
      <div class="photo-options-item" data-action="gallery">
        <svg width="17.8095" height="18.41534" viewBox="0 0 17.8095 18.41534" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(-11.25212,-439.23061)">
            <g fill="none" stroke="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}" stroke-width="1.25" stroke-miterlimit="10">
              <path d="M16.54431,457.02095c-2.57762,0 -4.66719,-2.08957 -4.66719,-4.66719v-7.83095c0,-2.57762 2.08957,-4.66719 4.66719,-4.66719h7.22512c2.57762,0 4.66719,2.08958 4.66719,4.66719c0,0 0,5.29696 0,6.61926c0,0.56574 0,1.2117 0,1.2117c0,2.57762 -2.08957,4.66719 -4.66719,4.66719c0,0 -2.30703,0 -3.49013,0c-1.2239,0 -3.73499,0 -3.73499,0z" stroke-linecap="butt"/>
              <path d="M22.7198,448.06654l-7.09419,8.16037" stroke-linecap="round"/>
              <path d="M28.39866,452.65931l-5.61794,-4.51076" stroke-linecap="round"/>
              <path d="M18.84406,445.31561c0,1.28899 -1.03731,2.33392 -2.31689,2.33392c-1.27958,0 -2.31689,-1.04493 -2.31689,-2.33392c0,-1.28899 1.03731,-2.33392 2.31689,-2.33392c1.27958,0 2.31689,1.04493 2.31689,2.33392z" stroke-linecap="butt"/>
            </g>
          </g>
        </svg>
        Галерея
      </div>
    `;
    photoButtonContainer.appendChild(photoButton);
    photoButtonContainer.appendChild(photoOptionsMenu);

    // ---------------- Кнопка LaTeX и меню математики ----------------
    const mathButtonContainer = document.createElement('div');
    mathButtonContainer.style.cssText = `
      position: relative;
      flex-shrink: 0;
      margin-right: 8px;
    `;
    const mathButton = document.createElement('button');
    mathButton.id = 'mathButton';
    mathButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      border-radius: 50%;
      transition: background-color 0.2s;
      flex-shrink: 0;
    `;
    mathButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 7.63362 25.00285" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(-35.15183,-759.79038)">
          <g stroke-miterlimit="10">
            <text transform="translate(36.18706,770.36709) scale(0.24597,0.24597)" font-size="40" xml:space="preserve"
              fill="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}" stroke="none" stroke-width="1" stroke-linecap="butt"
              font-family="Inter, Sans Serif" font-weight="normal" text-anchor="start">
              <tspan x="0" dy="0">a</tspan>
              <tspan x="0" dy="46.15px">b</tspan>
            </text>
            <path d="M35.77683,773.23987l6.38362,-0.06977" fill="none"
              stroke="${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}" stroke-width="1.25" stroke-linecap="round"/>
          </g>
        </g>
      </svg>
    `;
    const mathMenu = document.createElement('div');
    mathMenu.id = 'mathMenu';
    mathMenu.className = 'math-menu';
    mathMenu.innerHTML = `
      <div class="math-menu-section">Стиль</div>
      <div class="math-menu-item" data-type="style" data-value="auto">🤖 Авто</div>
      <div class="math-menu-item" data-type="style" data-value="expert">👨‍🎓 Эксперт</div>
      <div class="math-menu-item" data-type="style" data-value="easy">😊 Лёгкий</div>
      <div class="math-menu-section">Длина</div>
      <div class="math-menu-item" data-type="length" data-value="auto">🤖 Авто</div>
      <div class="math-menu-item" data-type="length" data-value="short">📝 Краткий</div>
      <div class="math-menu-item" data-type="length" data-value="medium">📄 Средний</div>
      <div class="math-menu-item" data-type="length" data-value="long">📋 Длинный</div>
    `;
    mathButtonContainer.appendChild(mathButton);
    mathButtonContainer.appendChild(mathMenu);

    // Текстовое поле сверху
    const textInputContainer = document.createElement('div');
    textInputContainer.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 50px;
    `;
    this.messageInput = document.createElement('textarea');
    this.messageInput.placeholder = 'Ask MX Chat';
    this.messageInput.style.cssText = `
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'};
      font-size: 16px;
      padding: 8px;
      resize: none;
      min-height: 24px;
      max-height: 120px;
      overflow-y: auto;
      font-family: inherit;
    `;

    // Контейнер для кнопок внизу
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
    `;
    const leftButtons = document.createElement('div');
    leftButtons.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // Кнопка отправки
    const sendButton = document.createElement('button');
    sendButton.textContent = '➤';
    sendButton.style.cssText = `
      background-color: #fe3636;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
      flex-shrink: 0;
    `;

    // Сборка inputContainer
    textInputContainer.appendChild(this.messageInput);
    leftButtons.appendChild(photoButtonContainer);
    leftButtons.appendChild(mathButtonContainer);
    buttonContainer.appendChild(leftButtons);
    buttonContainer.appendChild(sendButton);
    inputContainer.appendChild(textInputContainer);
    inputContainer.appendChild(buttonContainer);

    inputPanel.appendChild(inputContainer);
    inputPanel.appendChild(fileInput);
    inputPanel.appendChild(cameraInput);

    inputAreaContainer.appendChild(inputPanel);

    this.chatContainer.appendChild(chatHeader);
    this.chatContainer.appendChild(this.chatMessages);
    this.chatContainer.appendChild(imagePreviewContainer);
    this.chatContainer.appendChild(inputAreaContainer);

    document.body.appendChild(this.chatContainer);
    window.chatExtensionInstance = this;

    this.setupEventListeners();
  }

  // ---------------- Обработчики событий ----------------
  setupEventListeners() {
    // Закрытие чата
    const closeBtn = document.getElementById('closeChatBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hideChat());

    // Отправка сообщения по клику
    const sendButton = Array.from(this.chatContainer.querySelectorAll('button'))
      .find(btn => btn.textContent === '➤');
    if (sendButton) sendButton.addEventListener('click', () => this.sendUserMessage());

    // Меню фото
    const photoButton = document.getElementById('photoButton');
    if (photoButton) {
      photoButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('photoOptionsMenu');
        if (menu) {
          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
      });
    }
    const photoOptionsMenu = document.getElementById('photoOptionsMenu');
    if (photoOptionsMenu) {
      photoOptionsMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.photo-options-item');
        if (!item) return;
        const action = item.getAttribute('data-action');
        if (action === 'camera') {
          const cam = document.getElementById('cameraInput');
          if (cam) cam.click();
        } else if (action === 'gallery') {
          const fileInputEl = document.getElementById('imageFileInput');
          if (fileInputEl) fileInputEl.click();
        }
        photoOptionsMenu.style.display = 'none';
      });
    }

    // Меню заголовка
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('headerDropdownMenu');
        if (menu) {
          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
      });
    }
    // Пункт переименовать чат
    const renameMenuItem = document.getElementById('renameChatBtnMenu');
    if (renameMenuItem) {
      renameMenuItem.addEventListener('click', () => {
        const newTitle = prompt('Введите новое название чата:', this.chatTitle);
        if (newTitle && newTitle.trim()) {
          this.setChatTitle(newTitle.trim());
        }
        const headerMenu = document.getElementById('headerDropdownMenu');
        if (headerMenu) headerMenu.style.display = 'none';
      });
    }
    const clearMenuItem = document.getElementById('clearChatBtnMenu');
    if (clearMenuItem) clearMenuItem.addEventListener('click', () => this.clearChat());
    const deleteMenuItem = document.getElementById('deleteAndCloseBtnMenu');
    if (deleteMenuItem) deleteMenuItem.addEventListener('click', () => this.deleteAndClose());
    const shareMenuItem = document.getElementById('shareChatBtnMenu');
    if (shareMenuItem) shareMenuItem.addEventListener('click', () => this.shareChat());

    // Меню математики
    const mathButton = document.getElementById('mathButton');
    if (mathButton) {
      mathButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('mathMenu');
        if (menu) {
          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
      });
    }
    const mathMenuEl = document.getElementById('mathMenu');
    if (mathMenuEl) {
      mathMenuEl.addEventListener('click', (e) => {
        const item = e.target.closest('.math-menu-item');
        if (!item) return;
        // Убрать выделение с других элементов того же типа
        const type = item.getAttribute('data-type');
        const allItems = mathMenuEl.querySelectorAll(`[data-type="${type}"]`);
        allItems.forEach(el => el.classList.remove('selected'));
        // Выделить выбранный элемент
        item.classList.add('selected');
        // Вставить LaTeX с настройками
        const styleOrLength = item.getAttribute('data-value');
        const cursor = this.messageInput.selectionStart;
        const text = this.messageInput.value;
        const before = text.substring(0, cursor);
        const after = text.substring(cursor);
        let latexSnippet = '$$x^2 + y^2 = r^2$$'; // по умолчанию
        if (type === 'style') {
          if (styleOrLength === 'expert') latexSnippet = '$$\\frac{d}{dx}\\left(\\int_{a}^{x} f(t)dt\\right) = f(x)$$';
          else if (styleOrLength === 'easy') latexSnippet = '$2 + 2 = 4$';
          else latexSnippet = '$$x^2 + y^2 = r^2$$';
        } else if (type === 'length') {
          if (styleOrLength === 'short') latexSnippet = '$a+b=c$';
          else if (styleOrLength === 'medium') latexSnippet = '$$E=mc^2$$';
          else if (styleOrLength === 'long') latexSnippet = '$$\\int_{0}^{\\infty} e^{-x} dx = 1$$';
          else latexSnippet = '$$x^2 + y^2 = r^2$$';
        }
        this.messageInput.value = before + latexSnippet + after;
        this.messageInput.focus();
        mathMenuEl.style.display = 'none';
      });
    }
    // Закрытие меню математики при клике вне
    document.addEventListener('click', (e) => {
      const mathMenu = document.getElementById('mathMenu');
      if (mathMenu && !mathMenu.contains(e.target) && !e.target.closest('#mathButton')) {
        mathMenu.style.display = 'none';
      }
      // Закрытие фото-меню
      const photoMenu = document.getElementById('photoOptionsMenu');
      if (photoMenu && !photoMenu.contains(e.target) && e.target.id !== 'photoButton') {
        photoMenu.style.display = 'none';
      }
      // Закрытие меню заголовка
      const headerMenu = document.getElementById('headerDropdownMenu');
      if (headerMenu && !headerMenu.contains(e.target) && e.target.id !== 'menuBtn') {
        headerMenu.style.display = 'none';
      }
      // Закрытие контекстного меню
      if (this.contextMenu && !this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Загрузка изображений
    const fileInputEl = document.getElementById('imageFileInput');
    if (fileInputEl) fileInputEl.addEventListener('change', (e) => this.handleImageUpload(e));
    const cameraInputEl = document.getElementById('cameraInput');
    if (cameraInputEl) cameraInputEl.addEventListener('change', (e) => this.handleImageUpload(e));

    // Отправка по Enter, Shift+Enter - новая строка
    if (this.messageInput) {
      this.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendUserMessage();
        }
      });
      this.messageInput.addEventListener('input', () => {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        this.updateInputContainerStyle();
      });
    }
  }

  // ---------------- Стили inputContainer при вводе ----------------
  updateInputContainerStyle() {
    const inputContainer = document.getElementById('inputContainer');
    if (inputContainer) {
      // Всегда border-radius: 30px (как задано в CSS)
      inputContainer.style.borderRadius = '30px';
    }
  }

  // ---------------- Загрузка и показ превью изображения ----------------
  handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage = e.target.result;
        // Показать превью под input-bar
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        imagePreviewContainer.innerHTML = `
          <div style="
            position: relative;
            display: inline-block;
            max-width: 200px;
            border-radius: 20px; /* Увеличено */
            overflow: hidden;
            background: ${this.isDarkTheme ? '#4d4d4d' : '#f0f0f0'};
            padding: 8px;
            margin-left: 0;
          ">
            <img src="${e.target.result}" style="
              max-width: 100%;
              max-height: 100px;
              border-radius: 16px; /* Увеличено */
              display: block;
              cursor: pointer;
            ">
            <button style="
              position: absolute;
              top: 4px;
              right: 4px;
              background: rgba(0,0,0,0.7);
              color: white;
              border: none;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            " id="imagePreviewCloseBtn">×</button>
          </div>
        `;
        imagePreviewContainer.style.display = 'block';
        // При клике на картинку - полноэкранный предпросмотр
        const imgEl = imagePreviewContainer.querySelector('img');
        if (imgEl) {
          imgEl.addEventListener('click', () => this.showImagePreview(e.target.result));
        }
        // Закрытие превью под input-bar
        const btn = document.getElementById('imagePreviewCloseBtn');
        if (btn) {
          btn.addEventListener('click', () => {
            imagePreviewContainer.style.display = 'none';
            this.selectedImage = null;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // ---------------- Полноэкранный предпросмотр изображения ----------------
  showImagePreview(imageSrc) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      zoom: 2;
    `;
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      border-radius: 20px; /* Увеличено */
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      font-size: 24px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
    `;
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    const closePreview = () => {
      overlay.remove();
    };
    closeBtn.addEventListener('click', closePreview);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePreview();
    });
  }

  // ---------------- Markdown и LaTeX ----------------
  processMarkdownAndLatex(text) {
    let processedText = text;
    if (window.marked) {
      try {
        processedText = window.marked.parse(processedText);
      } catch (e) {
        console.error('Markdown parsing error:', e);
        processedText = this.escapeHtml(text);
      }
    } else {
      processedText = this.escapeHtml(text).replace(/\n/g, '<br>');
    }
    return processedText;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderLatex(element) {
    if (this.katexLoaded && this.autoRenderLoaded && window.renderMathInElement) {
      try {
        window.renderMathInElement(element, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\', right: '\', display: true},
            {left: '\', right: '\', display: false}
          ],
          throwOnError: false
        });
      } catch (e) {
        console.error('LaTeX rendering error:', e);
      }
    } else {
      setTimeout(() => {
        if (this.katexLoaded && this.autoRenderLoaded && window.renderMathInElement) {
          try {
            window.renderMathInElement(element, {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\', right: '\', display: true},
                {left: '\', right: '\', display: false}
              ],
              throwOnError: false
            });
          } catch (e) {
            console.error('LaTeX rendering error on retry:', e);
          }
        }
      }, 500);
    }
  }

  renderAllPendingLatex() {
    const elems = this.chatMessages.querySelectorAll('.markdown-content');
    elems.forEach(el => {
      this.renderLatex(el);
    });
  }

  // ---------------- Отправка/редактирование сообщений ----------------
  sendUserMessage() {
    const messageText = this.messageInput.value.trim();
    if (messageText || this.selectedImage) {
      if (this.editingMessageId !== null) {
        // Режим редактирования
        const idx = this.editingMessageIndex;
        if (idx !== null && idx >= 0) {
          // Удаляем последующие из DOM и массива
          const toRemove = this.messages.slice(idx + 1);
          toRemove.forEach(msg => {
            const el = document.querySelector(`[data-message-id="${msg.id}"]`);
            if (el) el.remove();
          });
          this.messages = this.messages.slice(0, idx + 1);
        }
        const msg = this.messages[idx];
        if (msg) {
          msg.text = messageText;
          if (this.selectedImage) {
            msg.image = this.selectedImage;
          } else {
            delete msg.image;
          }
          this.updateMessageInDOM(msg);
        }
        this.exitEditMode();
      } else {
        // Новое сообщение
        const messageData = {
          id: Date.now(),
          type: 'user',
          text: messageText,
          username: this.username,
          timestamp: new Date().toLocaleTimeString(),
          reaction: null
        };
        if (this.selectedImage) {
          messageData.image = this.selectedImage;
          this.lastImageDataURL = this.selectedImage;
        }
        this.messages.push(messageData);
        this.addMessageToChat(messageData);
      }
      // Сброс input
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
      this.updateInputContainerStyle();
      if (this.selectedImage) {
        document.getElementById('imagePreviewContainer').style.display = 'none';
        this.selectedImage = null;
      }
      this.scrollToBottom();
    }
  }

  exitEditMode() {
    this.editingMessageId = null;
    this.originalMessageText = '';
    this.editingMessageIndex = null;
    const editBanner = document.getElementById('editBanner');
    if (editBanner) {
      editBanner.style.display = 'none';
      editBanner.innerHTML = '';
    }
  }

  updateMessageInDOM(msg) {
    const messageElement = document.querySelector(`[data-message-id="${msg.id}"]`);
    if (!messageElement) return;
    const isUser = msg.type === 'user';
    // Найдём контейнеры внутри: первый может быть изображение, последний — текст
    const messageContainers = messageElement.querySelectorAll('div');
    const messageContainer = messageContainers[messageContainers.length - 1];
    if (msg.image) {
      const imgEl = messageElement.querySelector('img');
      if (imgEl) {
        imgEl.src = msg.image;
      }
    }
    let messageContent = '';
    if (msg.text) {
      if (isUser) {
        messageContent = `<div class="message-text">${this.escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>`;
      } else {
        messageContent = `<div class="markdown-content">${this.processMarkdownAndLatex(msg.text)}</div>`;
      }
    }
    messageContainer.innerHTML = messageContent;
    if (!isUser) {
      setTimeout(() => this.renderLatex(messageContainer), 100);
    }
  }

  addMessageToChat(messageData) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.dataset.messageId = messageData.id;
    const isUser = messageData.type === 'user';
    const isAI = messageData.type === 'ai';
    messageElement.style.cssText = `
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      ${isUser ? 'align-items: flex-end;' : 'align-items: flex-start;'}
      position: relative;
    `;
    // Если есть изображение, сначала отдельный контейнер
    if (messageData.image) {
      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = `
        margin-bottom: 8px;
        display: flex;
        ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
      `;
      const imageElement = document.createElement('img');
      imageElement.src = messageData.image;
      imageElement.style.cssText = `
        max-width: 300px;
        max-height: 300px;
        border-radius: 20px; /* Увеличено */
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      `;
      imageElement.addEventListener('click', () => this.showImagePreview(messageData.image));
      imageContainer.appendChild(imageElement);
      messageElement.appendChild(imageContainer);
    }
    // Контейнер для текстового сообщения
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
      max-width: 70%;
      padding: 16px 20px;
      border-radius: 32px; /* Увеличено */
      word-wrap: break-word;
      position: relative;
      ${isUser ?
        `background-color: #fe3636; color: white; border-bottom-right-radius: 12px; margin-left: auto;` :
        `background-color: ${this.isDarkTheme ? '#3d3d3d' : '#ffffff'}; color: ${this.isDarkTheme ? '#ffffff' : '#2c2c2c'}; border: 1px solid ${this.isDarkTheme ? '#5d5d5d' : '#e0e0e0'}; border-bottom-left-radius: 12px;`
      }
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    if (messageData.text) {
      if (isAI) {
        messageContainer.innerHTML = `<div class="markdown-content">${this.processMarkdownAndLatex(messageData.text)}</div>`;
      } else {
        messageContainer.innerHTML = `<div class="message-text">${this.escapeHtml(messageData.text).replace(/\n/g, '<br>')}</div>`;
      }
    }
    messageElement.appendChild(messageContainer);

    // Инфо и реакции
    const messageInfo = document.createElement('div');
    messageInfo.style.cssText = `
      font-size: 12px;
      color: ${this.isDarkTheme ? '#999999' : '#666666'};
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;
    let infoContent = `<span>${messageData.timestamp}</span>`;
    if (messageData.username && isUser) {
      infoContent = `<span>${messageData.username}</span><span>•</span>` + infoContent;
    }
    if (messageData.reaction) {
      infoContent += `<span style="font-size: 16px; margin-left: 4px;">${messageData.reaction}</span>`;
    }
    messageInfo.innerHTML = infoContent;
    messageElement.appendChild(messageInfo);

    // События контекстного меню
    let pressTimer;
    messageElement.addEventListener('mousedown', (e) => {
      pressTimer = setTimeout(() => {
        this.showContextMenu(e, messageData, messageElement);
      }, 500);
    });
    messageElement.addEventListener('mouseup', () => clearTimeout(pressTimer));
    messageElement.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    messageElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, messageData, messageElement);
    });

    // После вставки текста AI - рендерим LaTeX
    if (isAI && messageData.text) {
      setTimeout(() => this.renderLatex(messageContainer), 100);
    }

    this.chatMessages.appendChild(messageElement);
  }

  showContextMenu(event, messageData, messageElement) {
    this.hideContextMenu();
    const isUser = messageData.type === 'user';
    const isAI = messageData.type === 'ai';
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'chat-context-menu';
    let menuItems = '';
    if (isUser) {
      menuItems = `
        <div class="chat-context-menu-item" data-action="edit" data-id="${messageData.id}">✏️ Редактировать</div>
        <div class="chat-context-menu-item" data-action="copy" data-id="${messageData.id}">📋 Копировать</div>
      `;
    } else if (isAI) {
      menuItems = `
        <div class="chat-context-menu-item" data-action="like" data-id="${messageData.id}">👍 Нравится</div>
        <div class="chat-context-menu-item" data-action="dislike" data-id="${messageData.id}">👎 Не нравится</div>
        <div class="chat-context-menu-item" data-action="copy" data-id="${messageData.id}">📋 Копировать</div>
        <div class="chat-context-menu-item" data-action="select" data-id="${messageData.id}">✅ Выделить</div>
        <div class="chat-context-menu-item" data-action="regenerate" data-id="${messageData.id}">🔄 Сгенерировать заново</div>
      `;
    }
    this.contextMenu.innerHTML = menuItems;
    document.body.appendChild(this.contextMenu);
    this.contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.chat-context-menu-item');
      if (!item) return;
      const action = item.getAttribute('data-action');
      const id = Number(item.getAttribute('data-id'));
      if (action === 'edit') this.editMessage(id);
      else if (action === 'copy') this.copyMessage(id);
      else if (action === 'like') this.reactToMessage(id, '👍');
      else if (action === 'dislike') this.reactToMessage(id, '👎');
      else if (action === 'select') this.selectMessage(id);
      else if (action === 'regenerate') this.regenerateMessage(id);
      this.hideContextMenu();
    });
    const rect = this.contextMenu.getBoundingClientRect();
    let x = event.clientX;
    let y = event.clientY;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  editMessage(messageId) {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx < 0) return;
    if (this.editingMessageId !== null && this.editingMessageId !== messageId) {
      this.exitEditMode();
    }
    this.editingMessageId = messageId;
    this.editingMessageIndex = idx;
    const message = this.messages[idx];
    this.originalMessageText = message.text;

    this.messageInput.value = message.text;
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    this.updateInputContainerStyle();

    // Показать изображение если есть
    if (message.image) {
      this.selectedImage = message.image;
      // Показать превью под input-bar
      const imagePreviewContainer = document.getElementById('imagePreviewContainer');
      imagePreviewContainer.innerHTML = `
        <div style="
          position: relative;
          display: inline-block;
          max-width: 200px;
          border-radius: 20px; /* Увеличено */
          overflow: hidden;
          background: ${this.isDarkTheme ? '#4d4d4d' : '#f0f0f0'};
          padding: 8px;
          margin-left: 0;
        ">
          <img src="${message.image}" style="
            max-width: 100%;
            max-height: 100px;
            border-radius: 16px; /* Увеличено */
            display: block;
            cursor: pointer;
          ">
          <button style="
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          " id="imagePreviewCloseBtn">×</button>
        </div>
      `;
      imagePreviewContainer.style.display = 'block';
      const imgEl = imagePreviewContainer.querySelector('img');
      if (imgEl) {
        imgEl.addEventListener('click', () => this.showImagePreview(message.image));
      }
      const btn = document.getElementById('imagePreviewCloseBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          imagePreviewContainer.style.display = 'none';
          this.selectedImage = null;
        });
      }
    }

    const editBanner = document.getElementById('editBanner');
    if (editBanner) {
      editBanner.innerHTML = `<span>📝 Редактирование сообщения</span><button id="cancelEditBtn">×</button>`;
      editBanner.style.display = 'flex';

      const cancelBtn = document.getElementById('cancelEditBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.messageInput.value = '';
          this.messageInput.style.height = 'auto';
          this.updateInputContainerStyle();
          // Скрыть превью при отмене
          const imagePreviewContainer = document.getElementById('imagePreviewContainer');
          if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
          this.selectedImage = null;
          this.exitEditMode();
        });
      }
    }

    this.messageInput.focus();
  }

  copyMessage(messageId) {
    const message = this.messages.find(m => m.id === messageId);
    if (message && message.text) {
      navigator.clipboard.writeText(message.text).catch(err => console.error('Ошибка копирования:', err));
    }
  }

  reactToMessage(messageId, reaction) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      if (message.reaction === reaction) message.reaction = null;
      else message.reaction = reaction;
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        const messageInfo = messageElement.querySelector('div:last-child');
        const existingReaction = Array.from(messageInfo.querySelectorAll('span'))
          .find(span => span.style.fontSize === '16px');
        if (message.reaction) {
          if (existingReaction) existingReaction.textContent = message.reaction;
          else {
            const reactionSpan = document.createElement('span');
            reactionSpan.style.cssText = 'font-size: 16px; margin-left: 4px;';
            reactionSpan.textContent = message.reaction;
            messageInfo.appendChild(reactionSpan);
          }
        } else {
          if (existingReaction) existingReaction.remove();
        }
      }
    }
  }

  selectMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      document.querySelectorAll('.chat-message').forEach(el => el.style.backgroundColor = '');
      messageElement.style.backgroundColor = this.isDarkTheme ? 'rgba(254, 54, 54, 0.2)' : 'rgba(254, 54, 54, 0.1)';
      setTimeout(() => messageElement.style.backgroundColor = '', 2000);
    }
  }

  regenerateMessage(messageId) {
    console.log('Regenerating message:', messageId);
    // Логика повтора ИИ-запроса
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  shareChat() {
    const chatData = this.exportChat();
    if (navigator.share) {
      navigator.share({ title: 'Экспорт чата', text: chatData });
    } else {
      navigator.clipboard.writeText(chatData).then(() => alert('Чат скопирован в буфер обмена'));
    }
    const headerMenu = document.getElementById('headerDropdownMenu');
    if (headerMenu) headerMenu.style.display = 'none';
  }

  deleteAndClose() {
    this.clearChat();
    this.hideChat();
    const headerMenu = document.getElementById('headerDropdownMenu');
    if (headerMenu) headerMenu.style.display = 'none';
  }

  showChat() {
    this.chatVisible = true;
    this.chatContainer.style.display = 'flex';
  }

  hideChat() {
    this.chatVisible = false;
    this.chatContainer.style.display = 'none';
  }

  sendMessage(message) {
    const messageData = {
      id: Date.now(),
      type: 'system',
      text: message,
      username: 'Система',
      timestamp: new Date().toLocaleTimeString(),
      reaction: null
    };
    this.messages.push(messageData);
    this.addMessageToChat(messageData);
    this.scrollToBottom();
  }

  sendAIMessage(message) {
    const messageData = {
      id: Date.now(),
      type: 'ai',
      text: message,
      username: 'ИИ',
      timestamp: new Date().toLocaleTimeString(),
      reaction: null
    };
    this.messages.push(messageData);
    this.addMessageToChat(messageData);
    this.scrollToBottom();
  }

  sendMessageWithImage(message, imageUrl) {
    const messageData = {
      id: Date.now(),
      type: 'system',
      text: message,
      image: imageUrl,
      username: 'Система',
      timestamp: new Date().toLocaleTimeString(),
      reaction: null
    };
    this.messages.push(messageData);
    this.addMessageToChat(messageData);
    this.scrollToBottom();
  }

  whenMessageSent() {
    if (this.messageReceived) {
      this.messageReceived = false;
      return true;
    }
    return false;
  }

  getLastMessage() {
    return this.lastMessage;
  }

  getLastImageDataURL() {
    return this.lastImageDataURL;
  }

  setUsername(name) {
    this.username = name;
  }

  getUsername() {
    return this.username;
  }

  // ---------------- Методы для названия чата ----------------
  setChatTitle(title) {
    this.chatTitle = title;
    const titleSpan = document.getElementById('chatTitleSpan');
    if (titleSpan) {
      titleSpan.textContent = title;
    }
  }

  getChatTitle() {
    return this.chatTitle;
  }

  // ---------------- Экспорт/импорт чата с названием ----------------
  exportChat() {
    const chatData = {
      title: this.chatTitle,
      messages: this.messages,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(chatData, null, 2);
  }

  importChat(data) {
    try {
      const importedData = JSON.parse(data);

      // Поддержка старого формата (только массив сообщений)
      if (Array.isArray(importedData)) {
        this.messages = importedData;
      } else {
        // Новый формат с названием
        this.messages = importedData.messages || [];
        if (importedData.title) {
          this.setChatTitle(importedData.title);
        }
      }

      this.chatMessages.innerHTML = '';
      this.messages.forEach(messageData => this.addMessageToChat(messageData));
      setTimeout(() => this.renderAllPendingLatex(), 500);
      this.scrollToBottom();
    } catch (e) {
      console.error('Ошибка импорта чата:', e);
    }
  }

  clearChat() {
    this.messages = [];
    this.chatMessages.innerHTML = '';
    this.lastMessage = '';
    this.lastImageDataURL = '';
  }
}

Scratch.extensions.register(new ChatExtension());
