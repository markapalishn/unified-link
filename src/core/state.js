// State management
        // Check for data version to ensure demo data is loaded
        const DATA_VERSION = '3.5'; // Increment this when demo data changes
        const TEMPLATES_VERSION = '1.0';
        const storedVersion = localStorage.getItem('paymentLinksVersion');
        const storedTemplatesVersion = localStorage.getItem('paymentLinkTemplatesVersion');
        let links = [];
        let templates = [];
        
        // If version changed or no version exists, clear old data and load fresh demo data
        if (!storedVersion || storedVersion !== DATA_VERSION) {
            localStorage.removeItem('paymentLinks');
            localStorage.setItem('paymentLinksVersion', DATA_VERSION);
            links = [];
        } else {
            links = JSON.parse(localStorage.getItem('paymentLinks') || '[]');
        }

        if (!storedTemplatesVersion || storedTemplatesVersion !== TEMPLATES_VERSION) {
            templates = [
                {
                    id: 'tpl-consulting-fiscal',
                    name: 'Консультации с чеком',
                    settings: {
                        merchantName: 'Онлайн Школа IT',
                        linkType: 'reusable',
                        amountMode: 'fixed',
                        fixedAmount: 3500,
                        description: 'Оплата консультации специалиста',
                        collectEmail: true,
                        emailRequired: true,
                        collectPhone: false,
                        phoneRequired: false,
                        collectOrderDetails: false,
                        orderDetailsRequired: false,
                        generateReceipt: true,
                        receiptItems: [
                            { name: 'Консультация', quantity: '1', price: '3500', vat: 'none', paymentObject: 'service', paymentMethod: 'full_payment' }
                        ]
                    }
                },
                {
                    id: 'tpl-course-fiscal',
                    name: 'Курс с двумя позициями чека',
                    settings: {
                        merchantName: 'Лингва Академия',
                        linkType: 'single',
                        amountMode: 'fixed',
                        fixedAmount: 8990,
                        description: 'Оплата онлайн-курса',
                        collectEmail: true,
                        emailRequired: true,
                        collectPhone: true,
                        phoneRequired: false,
                        collectOrderDetails: false,
                        orderDetailsRequired: false,
                        generateReceipt: true,
                        receiptItems: [
                            { name: 'Обучающий курс', quantity: '1', price: '7990', vat: 'none', paymentObject: 'service', paymentMethod: 'full_payment' },
                            { name: 'Методические материалы', quantity: '1', price: '1000', vat: 'none', paymentObject: 'commodity', paymentMethod: 'full_payment' }
                        ]
                    }
                }
            ];
            localStorage.setItem('paymentLinkTemplatesVersion', TEMPLATES_VERSION);
            localStorage.setItem('paymentLinkTemplates', JSON.stringify(templates));
        } else {
            templates = JSON.parse(localStorage.getItem('paymentLinkTemplates') || '[]');
        }
        
        let selectedLinkId = localStorage.getItem('selectedLinkId') || null;
        let editingLinkId = null; // ID ссылки, которая сейчас редактируется
        let searchMode = 'merchant';
        let searchQuery = '';
        let additionalFieldsExpanded = false;
        let archivedLinksExpanded = false;
        let createWizardStep = 1;
        let createWizardDraft = null;

        function getDefaultReceiptItem() {
            return {
                name: '',
                quantity: '1',
                price: '',
                vat: 'none',
                paymentObject: 'commodity',
                paymentMethod: 'full_payment'
            };
        }

        function getDefaultCreateDraft() {
            return {
                templateId: '',
                title: '',
                templateName: '',
                merchantName: 'Онлайн Школа IT',
                amountMode: 'fixed',
                fixedAmount: '',
                linkType: 'reusable',
                description: '',
                collectEmail: false,
                emailRequired: false,
                collectPhone: false,
                phoneRequired: false,
                collectOrderDetails: false,
                orderDetailsRequired: false,
                generateReceipt: false,
                receiptItems: [getDefaultReceiptItem()],
                saveAsTemplate: false
            };
        }

        function applyTemplateToCreateDraft(templateId) {
            const draft = getDefaultCreateDraft();
            if (!templateId) {
                return draft;
            }
            const template = templates.find(t => t.id === templateId);
            if (!template) {
                return draft;
            }
            return {
                ...draft,
                ...template.settings,
                templateId
            };
        }

        // Base64 encoded T-Bank logo
        const tBankLogoBase64 = 'data:image/png;base64,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';

        // Mock data on first load - load demo data if localStorage is empty
        if (links.length === 0) {
            links = [
                // Онлайн Образование - 4 ссылки
                {
                    id: '1',
                    title: 'Курс программирования Python',
                    merchantName: 'Онлайн Школа IT',
                    amountMode: 'fixed',
                    fixedAmount: 14900,
                    description: 'Комплексный онлайн-курс по программированию на Python с нуля до уровня разработчика. Включает практические задания, проекты и сертификат об окончании.',
                    status: 'ready',
                    url: 'payment.com/link/1',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: true,
                    collectPhone: true,
                    phoneRequired: false,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '2',
                    title: 'Онлайн-курс английского языка',
                    merchantName: 'Лингва Академия',
                    amountMode: 'fixed',
                    fixedAmount: 8990,
                    description: 'Интерактивный курс английского языка для всех уровней. Групповые и индивидуальные занятия с носителями языка, доступ к платформе на 6 месяцев.',
                    status: 'ready',
                    url: 'payment.com/link/2',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: true,
                    collectPhone: false,
                    phoneRequired: false,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '3',
                    title: 'Подготовка к ЕГЭ по математике',
                    merchantName: 'Учебный Центр "Отличник"',
                    amountMode: 'free',
                    description: 'Индивидуальная подготовка к ЕГЭ по математике. Персональный план обучения, разбор всех типов задач, пробные экзамены и консультации с опытными преподавателями.',
                    status: 'ready',
                    url: 'payment.com/link/3',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: true,
                    collectPhone: true,
                    phoneRequired: true,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '4',
                    title: 'Курс дизайна интерфейсов',
                    merchantName: 'Дизайн Мастерская',
                    amountMode: 'fixed',
                    fixedAmount: 12900,
                    description: 'Профессиональный курс по UI/UX дизайну. Изучение Figma, создание прототипов, работа с типографикой и цветом. Портфолио из 5 реальных проектов.',
                    status: 'ready',
                    url: 'payment.com/link/4',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: false,
                    collectPhone: true,
                    phoneRequired: false,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date().toISOString()
                },
                // Дом и Ремонт - 4 ссылки
                {
                    id: '5',
                    title: 'Консультация дизайнера интерьера',
                    merchantName: 'Студия "Идеальный Дом"',
                    amountMode: 'fixed',
                    fixedAmount: 3500,
                    description: 'Профессиональная консультация дизайнера по планированию интерьера вашего дома. План расстановки мебели, подбор цветовой схемы и рекомендации по материалам.',
                    status: 'ready',
                    url: 'payment.com/link/5',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: true,
                    collectPhone: true,
                    phoneRequired: true,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '6',
                    title: 'Ремонт ванной комнаты',
                    merchantName: 'Ремонт Профи',
                    amountMode: 'free',
                    description: 'Комплексный ремонт ванной комнаты под ключ. Демонтаж старых покрытий, замена сантехники, укладка плитки, установка смесителей. Гарантия 2 года.',
                    status: 'ready',
                    url: 'payment.com/link/6',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: true,
                    collectPhone: true,
                    phoneRequired: true,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '7',
                    title: 'Установка кухни',
                    merchantName: 'Кухни Мастер',
                    amountMode: 'fixed',
                    fixedAmount: 12500,
                    description: 'Установка готовой кухни нашими специалистами. Выезд на замер, профессиональный монтаж мебели, подключение техники и сборка. Бесплатная доставка.',
                    status: 'ready',
                    url: 'payment.com/link/7',
                    qrDataUrl: '',
                    collectEmail: true,
                    emailRequired: false,
                    collectPhone: true,
                    phoneRequired: true,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '8',
                    title: 'Покраска стен',
                    merchantName: 'Ремонт Быстро',
                    amountMode: 'free',
                    description: 'Качественная покраска стен в квартире или доме. Подготовка поверхностей, грунтовка, нанесение краски в 2 слоя. Работаем аккуратно, защищаем мебель.',
                    status: 'ready',
                    url: 'payment.com/link/8',
                    qrDataUrl: '',
                    collectEmail: false,
                    emailRequired: false,
                    collectPhone: true,
                    phoneRequired: true,
                    collectOrderDetails: false,
                    orderDetailsRequired: false,
                    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            links = links.slice(0, 7).map((item, index) => ({
                ...item,
                linkType: [1, 3, 4, 5].includes(index) ? 'single' : 'reusable',
                status: index === 2 || index === 6 ? 'disabled' : ([4, 5].includes(index) ? 'paid' : 'ready')
            }));
            selectedLinkId = links[0].id;
            saveState();
        }

        let hasStatusMigration = false;
        links = links.map(link => {
            if (link.status === 'draft') {
                hasStatusMigration = true;
                return { ...link, status: 'ready' };
            }
            if (link.linkType === 'single' && link.status === 'disabled') {
                hasStatusMigration = true;
                return { ...link, status: 'paid' };
            }
            return link;
        });
        if (hasStatusMigration) {
            saveState();
        }

        function saveState() {
            localStorage.setItem('paymentLinks', JSON.stringify(links));
            if (selectedLinkId) {
                localStorage.setItem('selectedLinkId', selectedLinkId);
            }
        }

        function saveTemplates() {
            localStorage.setItem('paymentLinkTemplates', JSON.stringify(templates));
        }

        function generateId() {
            return Math.random().toString(36).substring(2, 15);
        }

        function openPreview(linkId) {
            // Сохраняем ID ссылки для предпросмотра
            window.open(`preview.html?id=${linkId}`, '_blank');
        }

        function setActiveTab(tab, element) {
            // Удаляем active класс со всех вкладок первого уровня
            const firstLevelNav = document.querySelector('nav > div:first-child');
            if (firstLevelNav) {
                firstLevelNav.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                });
            }
            // Добавляем active класс к выбранной вкладке
            if (element) {
                element.classList.add('active');
            }
        }

        function setActiveSubTab(subTab, element) {
            // Удаляем active класс со всех вкладок второго уровня
            const secondLevelNav = document.querySelector('nav > div:last-child');
            if (secondLevelNav) {
                secondLevelNav.querySelectorAll('.nav-tab').forEach(btn => {
                    btn.classList.remove('active');
                });
            }
            // Добавляем active класс к выбранной вкладке
            if (element) {
                element.classList.add('active');
            }
        }

        function setShopTab(tab, element) {
            // Удаляем активный стиль со всех табов
            document.querySelectorAll('.nav-tab-item').forEach(btn => {
                btn.classList.remove('text-gray-900');
                btn.classList.add('text-gray-500');
                btn.style.borderBottomColor = 'transparent';
            });
            // Добавляем активный стиль к выбранному табу
            if (element) {
                element.classList.remove('text-gray-500');
                element.classList.add('text-gray-900');
                element.style.borderBottomColor = '#FFDD2D';
            }
        }

        function selectLink(id) {
            selectedLinkId = id;
            saveState();
            render();
        }

        function closeEditing() {
            closeModal();
        }

        function openCreateModal() {
            editingLinkId = null;
            selectedLinkId = null;
            additionalFieldsExpanded = false;
            createWizardStep = 1;
            createWizardDraft = getDefaultCreateDraft();
            // Очищаем временные значения из localStorage при открытии модального окна создания
            localStorage.removeItem('tempCollectEmail');
            localStorage.removeItem('tempEmailRequired');
            localStorage.removeItem('tempCollectPhone');
            localStorage.removeItem('tempPhoneRequired');
            localStorage.removeItem('tempCollectOrderDetails');
            localStorage.removeItem('tempOrderDetailsRequired');
            localStorage.removeItem('tempLinkType');
            localStorage.removeItem('tempGenerateReceipt');
            localStorage.removeItem('tempReceiptItems');
            localStorage.removeItem('tempCreateTemplate');
            localStorage.removeItem('tempSelectedTemplateId');
            const modalOverlay = document.getElementById('modalOverlay');
            renderCreateModalContent(createWizardDraft);
            modalOverlay.style.display = 'flex';
            updateModalSaveBarVisibility(true);
        }

        function openEditModal(linkId, draft = null) {
            const link = links.find(l => l.id === linkId);
            if (!link) return;
            
            editingLinkId = linkId;
            selectedLinkId = linkId;
            
            const modalOverlay = document.getElementById('modalOverlay');
            const modalContent = document.getElementById('modalContent');
            const modalTopBar = document.getElementById('modalTopBar');
            if (modalTopBar) {
                modalTopBar.style.display = 'none';
                modalTopBar.innerHTML = '';
            }
            
            modalContent.innerHTML = `
                <button onclick="closeModal()" class="modal-close-outside" title="Закрыть">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
                <div class="modal-body-scroll">
                    <div class="p-6">
                        <div class="mb-5">
                            <h2 class="text-2xl font-medium text-black">Редактирование ссылки</h2>
                        </div>
                        ${renderFormFields(draft || link)}
                    </div>
                </div>
            `;
            
            modalOverlay.style.display = 'flex';
            updateModalSaveBarVisibility(true);
        }

        function closeModal() {
            const modalOverlay = document.getElementById('modalOverlay');
            const modalTopBar = document.getElementById('modalTopBar');
            modalOverlay.style.display = 'none';
            if (modalTopBar) {
                modalTopBar.style.display = 'none';
                modalTopBar.innerHTML = '';
            }
            updateModalSaveBarVisibility(false);
            // Очищаем временные значения из localStorage при закрытии модального окна создания
            if (editingLinkId === null) {
                localStorage.removeItem('tempCollectEmail');
                localStorage.removeItem('tempEmailRequired');
                localStorage.removeItem('tempCollectPhone');
                localStorage.removeItem('tempPhoneRequired');
                localStorage.removeItem('tempCollectOrderDetails');
                localStorage.removeItem('tempOrderDetailsRequired');
                localStorage.removeItem('tempLinkType');
                localStorage.removeItem('tempGenerateReceipt');
                localStorage.removeItem('tempReceiptItems');
                localStorage.removeItem('tempCreateTemplate');
                localStorage.removeItem('tempSelectedTemplateId');
            }
            editingLinkId = null;
            createWizardDraft = null;
            createWizardStep = 1;
            render();
        }

        function createNewLink() {
            openCreateModal();
        }

        function deleteLink(id) {
            links = links.filter(link => link.id !== id);
            if (selectedLinkId === id) {
                selectedLinkId = links.length > 0 ? links[0].id : null;
            }
            if (editingLinkId === id) {
                editingLinkId = null; // Закрываем редактирование при удалении ссылки
            }
            saveState();
            render();
        }


        function getStatusMeta(link) {
            const status = link ? link.status : 'ready';
            if (status === 'paid') {
                return {
                    dotClass: 'payment-link-status-dot-paid',
                    text: 'Оплачена'
                };
            }
            if (status === 'disabled') {
                return {
                    dotClass: 'payment-link-status-dot-disabled',
                    text: 'Выключена'
                };
            }
            return {
                dotClass: 'payment-link-status-dot-ready',
                text: link && link.generateReceipt ? 'Принимает платежи с чеком' : 'Принимает платежи'
            };
        }

        function getSingleLinkDaysLeft(link) {
            const createdAt = link && link.createdAt ? new Date(link.createdAt) : new Date();
            const elapsedMs = Math.max(0, Date.now() - createdAt.getTime());
            const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
            return Math.max(0, 30 - elapsedDays);
        }

        function toggleArchivedLinks() {
            archivedLinksExpanded = !archivedLinksExpanded;
            renderLinksList();
        }

        function handleSearchChange() {
            const modeEl = document.getElementById('searchMode');
            const inputEl = document.getElementById('searchInput');
            searchMode = modeEl ? modeEl.value : 'merchant';
            searchQuery = inputEl ? inputEl.value.trim().toLowerCase() : '';
            renderLinksList();
        }

        function enableLink(linkId) {
            const link = links.find(item => item.id === linkId);
            if (!link) {
                return;
            }
            link.status = 'ready';
            saveState();
            renderLinksList();
        }

        function openLinkTransactions(linkId) {
            const operationsTabButton = document.querySelector("button[onclick*=\"setActiveSubTab('operations'\"]");
            if (operationsTabButton) {
                setActiveSubTab('operations', operationsTabButton);
            }
            const link = links.find(item => item.id === linkId);
            const linkName = link && link.title ? link.title : 'без названия';
            showNotification(`Откроется раздел «Операции» с транзакциями по ссылке «${linkName}»`);
        }

        function setFeedbackReaction(reaction) {
            const buttons = document.querySelectorAll('.feedback-icon');
            buttons.forEach(button => {
                if (button.dataset.reaction === reaction) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
        }
