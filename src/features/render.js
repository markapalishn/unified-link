        function renderLinksList() {
            const container = document.getElementById('linksList');
            const intermediate = isIntermediateMode();
            const filteredLinks = links.filter(link => {
                if (intermediate && link.linkType === 'single') {
                    return false;
                }
                if (!searchQuery) {
                    return true;
                }
                const field = searchMode === 'title' ? (link.title || '') : (link.merchantName || '');
                return field.toLowerCase().includes(searchQuery);
            });

            if (filteredLinks.length === 0) {
                container.innerHTML = '<div class="payment-links-empty">Ничего не найдено</div>';
                return;
            }

            const activeLinks = filteredLinks.filter(link => {
                return !(link.status === 'disabled' || (link.linkType === 'single' && link.status === 'paid'));
            });
            const archivedLinks = filteredLinks.filter(link => {
                return link.status === 'disabled' || (link.linkType === 'single' && link.status === 'paid');
            }).sort((a, b) => {
                if (a.status === b.status) return 0;
                if (a.status === 'disabled') return -1;
                if (b.status === 'disabled') return 1;
                return 0;
            });

            const renderLinkRow = (link) => {
                const statusMeta = getStatusMeta(link);
                const titleText = link.title || 'Без названия';
                const linkType = link.linkType === 'single' ? 'single' : 'reusable';
                const linkTypeText = linkType === 'single' ? 'Одноразовая' : 'Многоразовая';
                const singleTimerHtml = linkType === 'single' && link.status !== 'paid'
                    ? `<span class="payment-link-expiry"><span class="payment-link-expiry-icon" aria-hidden="true"></span>Осталось ${getSingleLinkDaysLeft(link)} дн.</span>`
                    : '';
                const transactionsButtonHtml = isIntermediateMode()
                    ? ''
                    : `<button onclick="event.stopPropagation(); openLinkTransactions('${link.id}');" class="payment-link-action-btn" title="Транзакции">
                                <span class="payment-link-action-icon payment-link-action-icon-transactions" aria-hidden="true"></span>
                            </button>`;
                const actionsHtml = link.status === 'paid'
                    ? `<div class="payment-link-actions">
                            ${transactionsButtonHtml}
                       </div>`
                    : link.status === 'disabled'
                    ? `<div class="payment-link-disabled-actions">
                            <button onclick="event.stopPropagation(); enableLink('${link.id}');" class="payment-link-enable-btn" title="Включить ссылку">Включить</button>
                            <button onclick="event.stopPropagation(); deleteLink('${link.id}');" class="payment-link-delete-btn" title="Удалить ссылку">
                                <span class="payment-link-delete-icon" aria-hidden="true"></span>
                            </button>
                            ${transactionsButtonHtml}
                       </div>`
                    : `<div class="payment-link-actions">
                                ${linkType === 'reusable' ? transactionsButtonHtml : ''}
                                <button onclick="event.stopPropagation(); downloadQR('${link.id}');" class="payment-link-action-btn" title="Скопировать QR">
                                    <span class="payment-link-action-icon payment-link-action-icon-qr" aria-hidden="true"></span>
                                </button>
                                <button onclick="event.stopPropagation(); copyLinkUrl('${link.id}');" class="payment-link-action-btn" title="Скопировать ссылку">
                                    <span class="payment-link-action-icon payment-link-action-icon-copy" aria-hidden="true"></span>
                                </button>
                                <button onclick="event.stopPropagation(); openEditModal('${link.id}');" class="payment-link-action-btn" title="Редактировать">
                                    <span class="payment-link-action-icon payment-link-action-icon-edit" aria-hidden="true"></span>
                                </button>
                            </div>`;
                return `
                    <div class="payment-link-row">
                        <div class="payment-link-row-inner">
                            <div class="payment-link-main">
                                <div class="payment-link-status">
                                    <span class="payment-link-status-dot ${statusMeta.dotClass}"></span>
                                    <span class="payment-link-status-text">${statusMeta.text}</span>
                                </div>
                                <div class="payment-link-title-row">
                                    <div class="payment-link-title">${titleText}</div>
                                    <span class="payment-link-type-chip payment-link-type-chip-${linkType}">${linkTypeText}</span>
                                    ${singleTimerHtml}
                                </div>
                            </div>
                            ${actionsHtml}
                        </div>
                    </div>
                `;
            };

            const activeHtml = activeLinks.map(renderLinkRow).join('');
            const archivedHeaderHtml = archivedLinks.length > 0
                ? `<button class="archived-links-toggle" onclick="toggleArchivedLinks()">
                        <span>Оплаченные, просроченные и отключенные ссылки</span>
                        <span class="archived-links-toggle-icon">${archivedLinksExpanded ? '−' : '+'}</span>
                   </button>`
                : '';
            const archivedContentHtml = archivedLinks.length > 0 && archivedLinksExpanded
                ? `<div class="archived-links-list">${archivedLinks.map(renderLinkRow).join('')}</div>`
                : '';

            container.innerHTML = `${activeHtml}${archivedHeaderHtml}${archivedContentHtml}`;
        }

        function renderEditingForm(link) {
            // Form is now in modal, so this function is no longer needed
            // But keeping it for backward compatibility
            return '';
        }

        function renderLinkForm() {
            // Form is now in modal, so this function is no longer needed
            // But keeping it for backward compatibility
        }

        function renderFormFields(link) {
            const title = link ? (link.title || '') : '';
            const merchantName = link ? link.merchantName : 'Онлайн Школа IT';
            let linkType = 'reusable';
            const hiddenLinkType = document.querySelector('input[name="linkType"]:checked');
            if (hiddenLinkType) {
                linkType = hiddenLinkType.value;
            } else if (link) {
                linkType = link.linkType || 'reusable';
            } else if (typeof Storage !== 'undefined') {
                const tempLinkType = localStorage.getItem('tempLinkType');
                if (tempLinkType) {
                    linkType = tempLinkType;
                }
            }
            // Определяем режим суммы: сначала из скрытых полей, потом из ссылки, потом из localStorage, потом по умолчанию
            let amountMode = 'fixed';
            const hiddenRadio = document.querySelector('input[name="amountMode"]:checked');
            if (hiddenRadio) {
                amountMode = hiddenRadio.value;
            } else if (link) {
                amountMode = link.amountMode || 'fixed';
            } else if (typeof Storage !== 'undefined') {
                const tempMode = localStorage.getItem('tempAmountMode');
                if (tempMode) {
                    amountMode = tempMode;
                }
            }
            const fixedAmount = link ? (link.fixedAmount || '') : '';
            const description = link ? (link.description || '') : '';
            const collectEmail = link ? (link.collectEmail || false) : (localStorage.getItem('tempCollectEmail') === 'true');
            const emailRequired = link ? (link.emailRequired || false) : (localStorage.getItem('tempEmailRequired') === 'true');
            const collectPhone = link ? (link.collectPhone || false) : (localStorage.getItem('tempCollectPhone') === 'true');
            const phoneRequired = link ? (link.phoneRequired || false) : (localStorage.getItem('tempPhoneRequired') === 'true');
            const collectOrderDetails = link ? (link.collectOrderDetails || false) : (localStorage.getItem('tempCollectOrderDetails') === 'true');
            const orderDetailsRequired = link ? (link.orderDetailsRequired || false) : (localStorage.getItem('tempOrderDetailsRequired') === 'true');
            const generateReceipt = link ? (link.generateReceipt || false) : (localStorage.getItem('tempGenerateReceipt') === 'true');
            const createTemplate = localStorage.getItem('tempCreateTemplate') === 'true';
            let receiptItems = [];
            if (link && Array.isArray(link.receiptItems) && link.receiptItems.length > 0) {
                receiptItems = link.receiptItems;
            } else if (typeof Storage !== 'undefined') {
                const tempReceiptItems = localStorage.getItem('tempReceiptItems');
                if (tempReceiptItems) {
                    try {
                        const parsedItems = JSON.parse(tempReceiptItems);
                        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                            receiptItems = parsedItems;
                        }
                    } catch (e) {
                        receiptItems = [];
                    }
                }
            }
            if (generateReceipt && receiptItems.length === 0) {
                receiptItems = [getDefaultReceiptItem()];
            }

            const shops = [
                // Онлайн образование
                { value: 'Онлайн Школа IT', label: 'Онлайн Школа IT' },
                { value: 'Лингва Академия', label: 'Лингва Академия' },
                { value: 'Учебный Центр "Отличник"', label: 'Учебный Центр "Отличник"' },
                { value: 'Дизайн Мастерская', label: 'Дизайн Мастерская' },
                // Дом и ремонт
                { value: 'Студия "Идеальный Дом"', label: 'Студия "Идеальный Дом"' },
                { value: 'Ремонт Профи', label: 'Ремонт Профи' },
                { value: 'Кухни Мастер', label: 'Кухни Мастер' },
                { value: 'Ремонт Быстро', label: 'Ремонт Быстро' }
            ];

            // Форматируем фиксированную сумму для отображения
            const formattedFixedAmount = fixedAmount && fixedAmount > 0 
                ? formatAmount(fixedAmount.toString()) 
                : '';

            return `
                <div class="space-y-5">
                    ${editingLinkId ? `
                    <div>
                        <label class="mb-2 block text-sm font-normal text-black">Название ссылки</label>
                        <input type="text" id="linkTitle" value="${title}"
                            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
                            placeholder="Введите название ссылки">
                    </div>
                    ` : ''}
                    <div>
                        <label class="mb-2 block text-sm font-normal text-black">Выбор магазина</label>
                        <select id="merchantName" 
                            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white transition-colors">
                            ${shops.map(shop => `
                                <option value="${shop.value}" ${merchantName === shop.value ? 'selected' : ''}>${shop.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="mb-2 block text-sm font-normal text-black">Тип ссылки</label>
                        <div class="flex gap-3">
                            <button type="button" onclick="updateLinkType('reusable')" 
                                class="flex-1 rounded-xl px-4 py-2.5 text-sm font-normal text-black transition-colors hover:opacity-90 ${
                                    linkType === 'reusable' 
                                        ? '' 
                                        : 'opacity-60'
                                }" style="background-color: ${linkType === 'reusable' ? '#DED0BB' : '#F5F5F5'};">
                                Многоразовая
                            </button>
                            <button type="button" onclick="updateLinkType('single')" 
                                class="flex-1 rounded-xl px-4 py-2.5 text-sm font-normal text-black transition-colors hover:opacity-90 ${
                                    linkType === 'single' 
                                        ? '' 
                                        : 'opacity-60'
                                }" style="background-color: ${linkType === 'single' ? '#DED0BB' : '#F5F5F5'};">
                                Одноразовая
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="mb-3 block text-sm font-normal text-black">Формат оплаты</label>
                        <div class="flex gap-3">
                            <button type="button" onclick="updateAmountMode('fixed')" 
                                class="flex-1 rounded-xl px-4 py-2.5 text-sm font-normal text-black transition-colors hover:opacity-90 ${
                                    amountMode === 'fixed' 
                                        ? '' 
                                        : 'opacity-60'
                                }" style="background-color: ${amountMode === 'fixed' ? '#DED0BB' : '#F5F5F5'};">
                                Фиксированная
                            </button>
                            <button type="button" onclick="updateAmountMode('free')" 
                                class="flex-1 rounded-xl px-4 py-2.5 text-sm font-normal text-black transition-colors hover:opacity-90 ${
                                    amountMode === 'free' 
                                        ? '' 
                                        : 'opacity-60'
                                }" style="background-color: ${amountMode === 'free' ? '#DED0BB' : '#F5F5F5'};">
                                Свободная
                            </button>
                        </div>
                    </div>
                    <div id="fixedAmountField" style="display: ${amountMode === 'fixed' ? 'block' : 'none'};">
                        <label class="mb-2 block text-sm font-normal text-black">Сумма к оплате</label>
                        <input type="text" id="fixedAmount" 
                            value="${formattedFixedAmount}" 
                            oninput="handleFixedAmountInput(event)"
                            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
                            placeholder="0 ₽">
                    </div>
                    <div>
                        <label class="mb-2 block text-sm font-normal text-black">
                            Описание заказа
                            <span class="ml-2 text-xs font-normal text-gray-500">(<span id="descCount">${description.length}</span>/140)</span>
                        </label>
                        <textarea id="description" rows="3" maxlength="140" oninput="updateDescCount()"
                            class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                            placeholder="Введите описание заказа">${description}</textarea>
                    </div>
                    <div class="space-y-4 pt-2">
                        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-normal text-black">Формировать чек</label>
                                    <p class="text-xs text-gray-500 mt-0.5">Передавать данные товаров для фискализации</p>
                                </div>
                                <button type="button" onclick="toggleGenerateReceipt()" 
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors hover:opacity-90 ${
                                        generateReceipt ? '' : 'opacity-50'
                                    }" style="background-color: ${generateReceipt ? '#DED0BB' : '#E5E7EB'};">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                        generateReceipt ? 'translate-x-6' : 'translate-x-1'
                                    }"></span>
                                </button>
                            </div>
                            ${generateReceipt ? `
                                <div class="mt-4 space-y-4 border-t border-gray-200 pt-4">
                                    ${receiptItems.map((item, index) => `
                                        <div class="rounded-lg border border-gray-200 bg-white p-4">
                                            <div class="mb-3 flex items-center justify-between">
                                                <span class="text-sm font-medium text-black">Товар ${index + 1}</span>
                                                ${receiptItems.length > 1 ? `
                                                    <button type="button" onclick="removeReceiptItem(${index})" class="text-xs text-gray-500 hover:text-gray-700">Удалить</button>
                                                ` : ''}
                                            </div>
                                            <div class="space-y-3">
                                                <div>
                                                    <label class="mb-1 block text-xs text-gray-600">Название товара</label>
                                                    <input type="text" value="${item.name || ''}" oninput="updateReceiptItemField(${index}, 'name', this.value)"
                                                        class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                        placeholder="Например, Консультация">
                                                </div>
                                                <div class="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label class="mb-1 block text-xs text-gray-600">Количество</label>
                                                        <input type="number" min="1" step="0.01" value="${item.quantity || '1'}" oninput="updateReceiptItemField(${index}, 'quantity', this.value)"
                                                            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                                    </div>
                                                    <div>
                                                        <label class="mb-1 block text-xs text-gray-600">Цена, ₽</label>
                                                        <input type="number" min="0" step="0.01" value="${item.price || ''}" oninput="updateReceiptItemField(${index}, 'price', this.value)"
                                                            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                            placeholder="0">
                                                    </div>
                                                </div>
                                                <div>
                                                    <label class="mb-1 block text-xs text-gray-600">Ставка НДС</label>
                                                    <select onchange="updateReceiptItemField(${index}, 'vat', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                                        <option value="none" ${item.vat === 'none' ? 'selected' : ''}>Без НДС</option>
                                                        <option value="vat0" ${item.vat === 'vat0' ? 'selected' : ''}>НДС 0%</option>
                                                        <option value="vat10" ${item.vat === 'vat10' ? 'selected' : ''}>НДС 10%</option>
                                                        <option value="vat20" ${item.vat === 'vat20' ? 'selected' : ''}>НДС 20%</option>
                                                        <option value="vat110" ${item.vat === 'vat110' ? 'selected' : ''}>НДС 10/110</option>
                                                        <option value="vat120" ${item.vat === 'vat120' ? 'selected' : ''}>НДС 20/120</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label class="mb-1 block text-xs text-gray-600">Предмет расчета</label>
                                                    <select onchange="updateReceiptItemField(${index}, 'paymentObject', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                                        <option value="commodity" ${item.paymentObject === 'commodity' ? 'selected' : ''}>Товар</option>
                                                        <option value="service" ${item.paymentObject === 'service' ? 'selected' : ''}>Услуга</option>
                                                        <option value="job" ${item.paymentObject === 'job' ? 'selected' : ''}>Работа</option>
                                                        <option value="payment" ${item.paymentObject === 'payment' ? 'selected' : ''}>Платеж</option>
                                                        <option value="agent_commission" ${item.paymentObject === 'agent_commission' ? 'selected' : ''}>Агентское вознаграждение</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label class="mb-1 block text-xs text-gray-600">Способ расчета</label>
                                                    <select onchange="updateReceiptItemField(${index}, 'paymentMethod', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                                        <option value="full_payment" ${item.paymentMethod === 'full_payment' ? 'selected' : ''}>Полный расчет</option>
                                                        <option value="prepayment100" ${item.paymentMethod === 'prepayment100' ? 'selected' : ''}>Предоплата 100%</option>
                                                        <option value="prepayment" ${item.paymentMethod === 'prepayment' ? 'selected' : ''}>Частичная предоплата</option>
                                                        <option value="advance" ${item.paymentMethod === 'advance' ? 'selected' : ''}>Аванс</option>
                                                        <option value="partial_payment" ${item.paymentMethod === 'partial_payment' ? 'selected' : ''}>Частичный расчет и кредит</option>
                                                        <option value="credit" ${item.paymentMethod === 'credit' ? 'selected' : ''}>Передача в кредит</option>
                                                        <option value="credit_payment" ${item.paymentMethod === 'credit_payment' ? 'selected' : ''}>Оплата кредита</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                    <button type="button" onclick="addReceiptItem()" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                        Добавить товар
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${isIntermediateMode() ? '' : `
                    <div class="space-y-4 pt-2">
                        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-normal text-black">Создать шаблон</label>
                                    <p class="text-xs text-gray-500 mt-0.5">Сохраните текущие настройки, чтобы быстро создавать ссылки по шаблону</p>
                                </div>
                                <button type="button" onclick="toggleCreateTemplate()"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors hover:opacity-90 ${
                                        createTemplate ? '' : 'opacity-50'
                                    }" style="background-color: ${createTemplate ? '#DED0BB' : '#E5E7EB'};">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                        createTemplate ? 'translate-x-6' : 'translate-x-1'
                                    }"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                    `}
                    ${(link && link.qrDataUrl) ? renderLinkActions(link) : ''}
                </div>
            `;
        }

        function getCurrentFormDraft() {
            const merchantNameEl = document.getElementById('merchantName');
            const linkTypeEl = document.querySelector('input[name="linkType"]:checked');
            const amountModeEl = document.querySelector('input[name="amountMode"]:checked');
            const fixedAmountEl = document.getElementById('fixedAmount');
            const descriptionEl = document.getElementById('description');
            const linkFromState = (editingLinkId || selectedLinkId)
                ? links.find(l => l.id === (editingLinkId || selectedLinkId))
                : null;

            let amountMode = 'fixed';
            if (amountModeEl) {
                amountMode = amountModeEl.value;
            } else if (typeof Storage !== 'undefined') {
                const tempMode = localStorage.getItem('tempAmountMode');
                if (tempMode) {
                    amountMode = tempMode;
                }
            }

            const fixedAmountValue = fixedAmountEl ? parseAmount(fixedAmountEl.value || '0') : 0;

            const collectEmail = localStorage.getItem('tempCollectEmail') === 'true';
            const emailRequired = localStorage.getItem('tempEmailRequired') === 'true';
            const collectPhone = localStorage.getItem('tempCollectPhone') === 'true';
            const phoneRequired = localStorage.getItem('tempPhoneRequired') === 'true';
            const collectOrderDetails = localStorage.getItem('tempCollectOrderDetails') === 'true';
            const orderDetailsRequired = localStorage.getItem('tempOrderDetailsRequired') === 'true';
            const generateReceipt = linkFromState ? (linkFromState.generateReceipt || false) : (localStorage.getItem('tempGenerateReceipt') === 'true');
            const createTemplate = localStorage.getItem('tempCreateTemplate') === 'true';
            let receiptItems = [];
            if (linkFromState && Array.isArray(linkFromState.receiptItems)) {
                receiptItems = linkFromState.receiptItems;
            } else {
                const tempReceiptItems = localStorage.getItem('tempReceiptItems');
                if (tempReceiptItems) {
                    try {
                        const parsedItems = JSON.parse(tempReceiptItems);
                        if (Array.isArray(parsedItems)) {
                            receiptItems = parsedItems;
                        }
                    } catch (e) {
                        receiptItems = [];
                    }
                }
            }
            if (generateReceipt && receiptItems.length === 0) {
                receiptItems = [getDefaultReceiptItem()];
            }

            return {
                title: linkFromState ? (linkFromState.title || 'Платежная ссылка') : 'Платежная ссылка',
                merchantName: merchantNameEl ? merchantNameEl.value : 'Онлайн Школа IT',
                linkType: linkTypeEl ? linkTypeEl.value : (localStorage.getItem('tempLinkType') || 'reusable'),
                amountMode,
                fixedAmount: amountMode === 'fixed' ? fixedAmountValue : undefined,
                description: descriptionEl ? descriptionEl.value : '',
                collectEmail,
                emailRequired: collectEmail ? emailRequired : false,
                collectPhone,
                phoneRequired: collectPhone ? phoneRequired : false,
                collectOrderDetails,
                orderDetailsRequired: collectOrderDetails ? orderDetailsRequired : false,
                generateReceipt,
                receiptItems,
                createTemplate
            };
        }

        function toggleCreateTemplate() {
            const current = localStorage.getItem('tempCreateTemplate') === 'true';
            localStorage.setItem('tempCreateTemplate', (!current).toString());
            if (editingLinkId) {
                openEditModal(editingLinkId, getCurrentFormDraft());
            } else {
                renderCreateModalContent(getCurrentFormDraft());
            }
        }

        function applyTemplateFromSelect(templateId) {
            localStorage.setItem('tempSelectedTemplateId', templateId || '');
            if (!templateId) {
                renderCreateModalContent(null);
                return;
            }
            const template = templates.find(t => t.id === templateId);
            if (!template) return;
            localStorage.setItem('tempCreateTemplate', 'false');
            renderCreateModalContent({
                ...template.settings,
                title: 'Платежная ссылка'
            });
        }

        function toggleAdditionalFields() {
            const currentDraft = getCurrentFormDraft();
            if (editingLinkId) {
                openEditModal(editingLinkId, currentDraft);
            } else {
                renderCreateModalContent(currentDraft);
            }
        }

        function toggleGenerateReceipt() {
            const linkId = editingLinkId || selectedLinkId;
            if (linkId) {
                const link = links.find(l => l.id === linkId);
                if (!link) return;
                link.generateReceipt = !link.generateReceipt;
                if (link.generateReceipt && (!Array.isArray(link.receiptItems) || link.receiptItems.length === 0)) {
                    link.receiptItems = [getDefaultReceiptItem()];
                }
                link.updatedAt = new Date().toISOString();
                saveState();
                openEditModal(linkId, link);
                return;
            }

            const current = localStorage.getItem('tempGenerateReceipt') === 'true';
            const next = !current;
            localStorage.setItem('tempGenerateReceipt', next.toString());
            if (next) {
                const existing = localStorage.getItem('tempReceiptItems');
                if (!existing) {
                    localStorage.setItem('tempReceiptItems', JSON.stringify([getDefaultReceiptItem()]));
                }
            } else {
                localStorage.removeItem('tempReceiptItems');
            }
            renderCreateModalContent(getCurrentFormDraft());
        }

        function updateReceiptItemsState(nextItems, options = {}) {
            const shouldRerender = options.rerender !== false;
            const linkId = editingLinkId || selectedLinkId;
            if (linkId) {
                const link = links.find(l => l.id === linkId);
                if (!link) return;
                link.receiptItems = nextItems;
                link.updatedAt = new Date().toISOString();
                saveState();
                if (shouldRerender) {
                    openEditModal(linkId, link);
                }
                return;
            }
            localStorage.setItem('tempReceiptItems', JSON.stringify(nextItems));
            if (shouldRerender) {
                renderCreateModalContent(getCurrentFormDraft());
            }
        }

        function addReceiptItem() {
            const draft = getCurrentFormDraft();
            const items = Array.isArray(draft.receiptItems) ? draft.receiptItems.slice() : [];
            items.push(getDefaultReceiptItem());
            updateReceiptItemsState(items, { rerender: true });
        }

        function removeReceiptItem(index) {
            const draft = getCurrentFormDraft();
            const items = Array.isArray(draft.receiptItems) ? draft.receiptItems.slice() : [];
            if (items.length <= 1) return;
            items.splice(index, 1);
            updateReceiptItemsState(items, { rerender: true });
        }

        function updateReceiptItemField(index, field, value) {
            const draft = getCurrentFormDraft();
            const items = Array.isArray(draft.receiptItems) ? draft.receiptItems.slice() : [getDefaultReceiptItem()];
            if (!items[index]) return;
            items[index] = { ...items[index], [field]: value };
            updateReceiptItemsState(items, { rerender: false });
        }

        function updateModalSaveBarVisibility(isVisible) {
            const saveBar = document.getElementById('modalSaveBar');
            const disableButton = document.getElementById('modalDisableButton');
            const saveButton = document.getElementById('modalSaveButton');
            if (!saveBar) return;
            const isCreateMode = !editingLinkId;
            const showSaveBar = isVisible && !isCreateMode;
            saveBar.style.display = showSaveBar ? 'flex' : 'none';
            if (disableButton) {
                const currentLink = editingLinkId ? links.find(l => l.id === editingLinkId) : null;
                const canShowAction = Boolean(isVisible && editingLinkId && currentLink && currentLink.status !== 'paid');
                disableButton.style.display = canShowAction ? 'inline-flex' : 'none';
                if (canShowAction) {
                    disableButton.textContent = currentLink.linkType === 'single' ? 'Удалить' : 'Отключить';
                }
            }
            if (saveButton) {
                saveButton.textContent = 'Сохранить';
            }
        }

        function updateCreateWizardField(field, value, shouldRerender = false) {
            if (!createWizardDraft) {
                createWizardDraft = getDefaultCreateDraft();
            }
            createWizardDraft = { ...createWizardDraft, [field]: value };
            if (shouldRerender) {
                renderCreateModalContent(createWizardDraft);
            }
        }

        function validateCreateWizardStep(step, draft) {
            const currentDraft = draft || createWizardDraft || getDefaultCreateDraft();

            if (step === 1) {
                const title = (currentDraft.title || '').trim();
                const amount = parseAmount(String(currentDraft.fixedAmount || '0'));
                if (!title) {
                    showNotification('Шаг 1: укажите название ссылки');
                    return false;
                }
                if (!amount || amount <= 0) {
                    showNotification('Шаг 1: укажите сумму больше 0 ₽');
                    return false;
                }
                return true;
            }

            if (step === 2) {
                const description = (currentDraft.description || '').trim();
                if (!description) {
                    showNotification('Шаг 2: добавьте описание ссылки');
                    return false;
                }
                return true;
            }

            if (step === 3) {
                if (!currentDraft.generateReceipt) {
                    return true;
                }
                const items = Array.isArray(currentDraft.receiptItems) ? currentDraft.receiptItems : [];
                if (items.length === 0) {
                    showNotification('Шаг 3: добавьте хотя бы один товар для чека');
                    return false;
                }
                const invalidItem = items.find(item => {
                    const itemName = (item.name || '').trim();
                    const qty = Number(item.quantity);
                    const price = Number(item.price);
                    return !itemName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0;
                });
                if (invalidItem) {
                    showNotification('Шаг 3: заполните название, количество и цену у всех товаров');
                    return false;
                }
                return true;
            }

            return true;
        }

        function goCreateWizardStep(step) {
            const nextStep = Math.max(1, Math.min(4, step));
            if (nextStep > createWizardStep) {
                for (let s = createWizardStep; s < nextStep; s++) {
                    if (!validateCreateWizardStep(s, createWizardDraft)) {
                        return;
                    }
                }
            }
            createWizardStep = nextStep;
            renderCreateModalContent(createWizardDraft);
        }

        function selectTemplateForCreate(templateId) {
            createWizardDraft = applyTemplateToCreateDraft(templateId);
            createWizardStep = 1;
            renderCreateModalContent(createWizardDraft);
        }

        function createFromTemplateWithoutEditing() {
            if (!createWizardDraft) {
                createWizardDraft = getDefaultCreateDraft();
            }
            const templateId = (createWizardDraft.templateId || '').trim();
            if (!templateId) {
                showNotification('Выберите шаблон для быстрого создания');
                return;
            }
            const templateExists = templates.some(template => template.id === templateId);
            if (!templateExists) {
                showNotification('Выбранный шаблон не найден');
                return;
            }
            createWizardDraft = {
                ...applyTemplateToCreateDraft(templateId),
                saveAsTemplate: false,
                templateName: ''
            };
            saveDraft();
        }

        function toggleCreateWizardReceipt() {
            if (!createWizardDraft) {
                createWizardDraft = getDefaultCreateDraft();
            }
            const next = !createWizardDraft.generateReceipt;
            createWizardDraft.generateReceipt = next;
            if (next && (!Array.isArray(createWizardDraft.receiptItems) || createWizardDraft.receiptItems.length === 0)) {
                createWizardDraft.receiptItems = [getDefaultReceiptItem()];
            }
            renderCreateModalContent(createWizardDraft);
        }

        function addCreateWizardReceiptItem() {
            if (!createWizardDraft) createWizardDraft = getDefaultCreateDraft();
            const items = Array.isArray(createWizardDraft.receiptItems) ? createWizardDraft.receiptItems.slice() : [];
            items.push(getDefaultReceiptItem());
            createWizardDraft.receiptItems = items;
            renderCreateModalContent(createWizardDraft);
        }

        function removeCreateWizardReceiptItem(index) {
            if (!createWizardDraft) createWizardDraft = getDefaultCreateDraft();
            const items = Array.isArray(createWizardDraft.receiptItems) ? createWizardDraft.receiptItems.slice() : [];
            if (items.length <= 1) return;
            items.splice(index, 1);
            createWizardDraft.receiptItems = items;
            renderCreateModalContent(createWizardDraft);
        }

        function updateCreateWizardReceiptItem(index, field, value) {
            if (!createWizardDraft) createWizardDraft = getDefaultCreateDraft();
            const items = Array.isArray(createWizardDraft.receiptItems) ? createWizardDraft.receiptItems.slice() : [getDefaultReceiptItem()];
            if (!items[index]) return;
            items[index] = { ...items[index], [field]: value };
            createWizardDraft.receiptItems = items;
        }

        function disableCurrentEditingLink() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) return;
            const link = links.find(l => l.id === linkId);
            if (!link) return;
            if (link.linkType === 'single') {
                deleteLink(linkId);
                closeModal();
                return;
            }
            link.status = 'disabled';
            link.updatedAt = new Date().toISOString();
            saveState();
            closeModal();
        }

        function updateLinkType(type) {
            const linkId = editingLinkId || selectedLinkId;

            if (linkId) {
                const link = links.find(l => l.id === linkId);
                if (link) {
                    link.linkType = type;
                    link.updatedAt = new Date().toISOString();
                    saveState();
                }
            } else if (typeof Storage !== 'undefined') {
                localStorage.setItem('tempLinkType', type);
            }

            const hiddenRadios = document.querySelectorAll('input[name="linkType"]');
            if (hiddenRadios.length > 0) {
                hiddenRadios.forEach(radio => {
                    radio.checked = radio.value === type;
                });
            } else {
                ['reusable', 'single'].forEach(value => {
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'radio';
                    hiddenInput.name = 'linkType';
                    hiddenInput.value = value;
                    hiddenInput.checked = value === type;
                    hiddenInput.style.display = 'none';
                    document.body.appendChild(hiddenInput);
                });
            }

            const buttons = document.querySelectorAll('button[onclick*="updateLinkType"]');
            buttons.forEach(button => {
                const buttonType = button.getAttribute('onclick').includes("'reusable'") ? 'reusable' : 'single';
                if (buttonType === type) {
                    button.style.backgroundColor = '#DED0BB';
                    button.classList.remove('opacity-60');
                } else {
                    button.style.backgroundColor = '#F5F5F5';
                    button.classList.add('opacity-60');
                }
            });
        }

        function renderCreateModalContent(draft) {
            const modalContent = document.getElementById('modalContent');
            const modalTopBar = document.getElementById('modalTopBar');
            if (!modalContent) return;
            const safeDraft = draft || createWizardDraft || getDefaultCreateDraft();
            createWizardDraft = safeDraft;
            const stepContent = renderCreateWizardStep(safeDraft);
            const stepNames = isIntermediateMode()
                ? ['Основыные поля', 'Формат платежа', 'Фискализация', 'Подтверждение']
                : ['Основыные поля', 'Формат платежа', 'Фискализация', 'Шаблонизация'];
            if (modalTopBar) {
                modalTopBar.style.display = 'flex';
                modalTopBar.innerHTML = `
                    <div class="create-wizard-steps">
                        ${stepNames.map((name, idx) => `
                            <div class="create-wizard-step ${createWizardStep === idx + 1 ? 'active' : ''}">
                                <span class="create-wizard-step-index">${idx + 1}</span>
                                <span class="create-wizard-step-name">${name}</span>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="closeModal()" class="create-wizard-close" title="Закрыть">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                `;
            }

            modalContent.innerHTML = `
                <div class="modal-body-scroll">
                    <div class="p-6">
                        <div class="mb-5">
                            <h2 class="text-2xl font-medium text-black">Создание платежной ссылки</h2>
                        </div>
                        ${stepContent}
                    </div>
                </div>
            `;
            updateModalSaveBarVisibility(true);
        }

        function renderCreateWizardStep(draft) {
            if (createWizardStep === 1) {
                const intermediate = isIntermediateMode();
                return `
                    <div class="space-y-5">
                        ${intermediate ? '' : `
                        <div>
                            <label class="mb-2 block text-sm font-normal text-black">Шаблон</label>
                            <select onchange="selectTemplateForCreate(this.value)" class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                <option value="">Без шаблона</option>
                                ${templates.map(template => `
                                    <option value="${template.id}" ${draft.templateId === template.id ? 'selected' : ''}>${template.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        `}
                        <div>
                            <label class="mb-2 block text-sm font-normal text-black">Название ссылки</label>
                            <input type="text" value="${draft.title || ''}" oninput="updateCreateWizardField('title', this.value)"
                                class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Например, Оплата консультации">
                        </div>
                        <div>
                            <label class="mb-2 block text-sm font-normal text-black">Сумма к оплате</label>
                            <input type="text" value="${draft.fixedAmount || ''}" oninput="updateCreateWizardField('fixedAmount', this.value)"
                                class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Например, 3500">
                        </div>
                        <div class="flex justify-between pt-2">
                            <span></span>
                            <div class="flex items-center gap-2">
                                ${(!intermediate && draft.templateId) ? `<button type="button" onclick="createFromTemplateWithoutEditing()" class="rounded-xl bg-gray-200 px-5 py-2.5 text-sm text-black hover:bg-gray-300">Создать без редактировани</button>` : ''}
                                <button type="button" onclick="goCreateWizardStep(2)" class="rounded-xl bg-[#DED0BB] px-5 py-2.5 text-sm text-black hover:opacity-90">Далее</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (createWizardStep === 2) {
                const intermediate = isIntermediateMode();
                return `
                    <div class="space-y-5">
                        ${intermediate ? '' : `
                        <div>
                            <label class="mb-2 block text-sm font-normal text-black">Тип ссылки</label>
                            <div class="flex gap-3">
                                <button type="button" onclick="updateCreateWizardField('linkType', 'reusable', true)" class="flex-1 rounded-xl px-4 py-2.5 text-sm ${draft.linkType === 'reusable' ? '' : 'opacity-60'}" style="background-color: ${draft.linkType === 'reusable' ? '#DED0BB' : '#F5F5F5'};">Многоразовая</button>
                                <button type="button" onclick="updateCreateWizardField('linkType', 'single', true)" class="flex-1 rounded-xl px-4 py-2.5 text-sm ${draft.linkType === 'single' ? '' : 'opacity-60'}" style="background-color: ${draft.linkType === 'single' ? '#DED0BB' : '#F5F5F5'};">Одноразовая</button>
                            </div>
                        </div>
                        `}
                        <div>
                            <label class="mb-2 block text-sm font-normal text-black">Формат оплаты</label>
                            <div class="flex gap-3">
                                <button type="button" onclick="updateCreateWizardField('amountMode', 'fixed', true)" class="flex-1 rounded-xl px-4 py-2.5 text-sm ${draft.amountMode === 'fixed' ? '' : 'opacity-60'}" style="background-color: ${draft.amountMode === 'fixed' ? '#DED0BB' : '#F5F5F5'};">Фиксированная</button>
                                <button type="button" onclick="updateCreateWizardField('amountMode', 'free', true)" class="flex-1 rounded-xl px-4 py-2.5 text-sm ${draft.amountMode === 'free' ? '' : 'opacity-60'}" style="background-color: ${draft.amountMode === 'free' ? '#DED0BB' : '#F5F5F5'};">Свободная</button>
                            </div>
                        </div>
                        <div>
                            <label class="mb-2 block text-sm font-normal text-black">Описание</label>
                            <textarea rows="3" maxlength="140" oninput="updateCreateWizardField('description', this.value)"
                                class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                                placeholder="Введите описание заказа">${draft.description || ''}</textarea>
                        </div>
                        <div class="flex justify-between pt-2">
                            <button type="button" onclick="goCreateWizardStep(1)" class="rounded-xl bg-gray-200 px-5 py-2.5 text-sm text-black hover:bg-gray-300">Назад</button>
                            <button type="button" onclick="goCreateWizardStep(3)" class="rounded-xl bg-[#DED0BB] px-5 py-2.5 text-sm text-black hover:opacity-90">Далее</button>
                        </div>
                    </div>
                `;
            }

            if (createWizardStep === 3) {
                return `
                    <div class="space-y-5">
                        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-normal text-black">Формировать чек</label>
                                    <p class="text-xs text-gray-500 mt-0.5">Передавать данные товаров для фискализации</p>
                                </div>
                                <button type="button" onclick="toggleCreateWizardReceipt()" class="relative inline-flex h-6 w-11 items-center rounded-full hover:opacity-90 ${draft.generateReceipt ? '' : 'opacity-50'}" style="background-color: ${draft.generateReceipt ? '#DED0BB' : '#E5E7EB'};">
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ${draft.generateReceipt ? 'translate-x-6' : 'translate-x-1'}"></span>
                                </button>
                            </div>
                            ${draft.generateReceipt ? `
                            <div class="mt-4 space-y-3 border-t border-gray-200 pt-4">
                                ${(draft.receiptItems || []).map((item, index) => `
                                    <div class="rounded-lg border border-gray-200 bg-white p-3">
                                        <div class="mb-2 flex items-center justify-between">
                                            <div class="text-xs text-gray-500">Товар ${index + 1}</div>
                                            ${(draft.receiptItems || []).length > 1 ? `
                                                <button type="button" onclick="removeCreateWizardReceiptItem(${index})" class="text-xs text-gray-500 hover:text-gray-700">Удалить</button>
                                            ` : ''}
                                        </div>
                                        <input type="text" value="${item.name || ''}" oninput="updateCreateWizardReceiptItem(${index}, 'name', this.value)" class="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Название товара">
                                        <div class="grid grid-cols-2 gap-2">
                                            <input type="number" min="1" step="0.01" value="${item.quantity || '1'}" oninput="updateCreateWizardReceiptItem(${index}, 'quantity', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Кол-во">
                                            <input type="number" min="0" step="0.01" value="${item.price || ''}" oninput="updateCreateWizardReceiptItem(${index}, 'price', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Цена">
                                        </div>
                                        <div class="mt-2">
                                            <label class="mb-1 block text-xs text-gray-600">Ставка НДС</label>
                                            <select onchange="updateCreateWizardReceiptItem(${index}, 'vat', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
                                                <option value="none" ${item.vat === 'none' ? 'selected' : ''}>Без НДС</option>
                                                <option value="vat0" ${item.vat === 'vat0' ? 'selected' : ''}>НДС 0%</option>
                                                <option value="vat10" ${item.vat === 'vat10' ? 'selected' : ''}>НДС 10%</option>
                                                <option value="vat20" ${item.vat === 'vat20' ? 'selected' : ''}>НДС 20%</option>
                                                <option value="vat110" ${item.vat === 'vat110' ? 'selected' : ''}>НДС 10/110</option>
                                                <option value="vat120" ${item.vat === 'vat120' ? 'selected' : ''}>НДС 20/120</option>
                                            </select>
                                        </div>
                                        <div class="mt-2">
                                            <label class="mb-1 block text-xs text-gray-600">Предмет расчета</label>
                                            <select onchange="updateCreateWizardReceiptItem(${index}, 'paymentObject', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
                                                <option value="commodity" ${item.paymentObject === 'commodity' ? 'selected' : ''}>Товар</option>
                                                <option value="service" ${item.paymentObject === 'service' ? 'selected' : ''}>Услуга</option>
                                                <option value="job" ${item.paymentObject === 'job' ? 'selected' : ''}>Работа</option>
                                                <option value="payment" ${item.paymentObject === 'payment' ? 'selected' : ''}>Платеж</option>
                                                <option value="agent_commission" ${item.paymentObject === 'agent_commission' ? 'selected' : ''}>Агентское вознаграждение</option>
                                            </select>
                                        </div>
                                        <div class="mt-2">
                                            <label class="mb-1 block text-xs text-gray-600">Способ расчета</label>
                                            <select onchange="updateCreateWizardReceiptItem(${index}, 'paymentMethod', this.value)" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
                                                <option value="full_payment" ${item.paymentMethod === 'full_payment' ? 'selected' : ''}>Полный расчет</option>
                                                <option value="prepayment100" ${item.paymentMethod === 'prepayment100' ? 'selected' : ''}>Предоплата 100%</option>
                                                <option value="prepayment" ${item.paymentMethod === 'prepayment' ? 'selected' : ''}>Частичная предоплата</option>
                                                <option value="advance" ${item.paymentMethod === 'advance' ? 'selected' : ''}>Аванс</option>
                                                <option value="partial_payment" ${item.paymentMethod === 'partial_payment' ? 'selected' : ''}>Частичный расчет и кредит</option>
                                                <option value="credit" ${item.paymentMethod === 'credit' ? 'selected' : ''}>Передача в кредит</option>
                                                <option value="credit_payment" ${item.paymentMethod === 'credit_payment' ? 'selected' : ''}>Оплата кредита</option>
                                            </select>
                                        </div>
                                    </div>
                                `).join('')}
                                <button type="button" onclick="addCreateWizardReceiptItem()" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">Добавить товар</button>
                            </div>` : ''}
                        </div>
                        <div class="flex justify-between pt-2">
                            <button type="button" onclick="goCreateWizardStep(2)" class="rounded-xl bg-gray-200 px-5 py-2.5 text-sm text-black hover:bg-gray-300">Назад</button>
                            <button type="button" onclick="goCreateWizardStep(4)" class="rounded-xl bg-[#DED0BB] px-5 py-2.5 text-sm text-black hover:opacity-90">Далее</button>
                        </div>
                    </div>
                `;
            }

            const intermediate = isIntermediateMode();
            return `
                <div class="space-y-5">
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                        <p class="text-sm text-black">${intermediate ? 'Проверьте настройки и создайте платежную ссылку.' : 'Проверьте настройки и создайте ссылку. Если нужно, сохраните эти параметры как шаблон для быстрого создания в будущем.'}</p>
                        ${intermediate ? '' : `
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="text-sm font-normal text-black">Сохранить как шаблон</label>
                                <p class="text-xs text-gray-500 mt-0.5">Шаблон будет доступен в первом шаге создания</p>
                            </div>
                            <button type="button" onclick="updateCreateWizardField('saveAsTemplate', !createWizardDraft.saveAsTemplate, true)" class="relative inline-flex h-6 w-11 items-center rounded-full hover:opacity-90 ${createWizardDraft.saveAsTemplate ? '' : 'opacity-50'}" style="background-color: ${createWizardDraft.saveAsTemplate ? '#DED0BB' : '#E5E7EB'};">
                                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ${createWizardDraft.saveAsTemplate ? 'translate-x-6' : 'translate-x-1'}"></span>
                            </button>
                        </div>
                        ${createWizardDraft.saveAsTemplate ? `
                            <div>
                                <label class="mb-1 block text-xs text-gray-600">Название шаблона</label>
                                <input type="text" value="${createWizardDraft.templateName || ''}" oninput="updateCreateWizardField('templateName', this.value)"
                                    class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Например, Шаблон консультации">
                            </div>
                        ` : ''}
                        `}
                    </div>
                    <div class="flex justify-between pt-2">
                        <button type="button" onclick="goCreateWizardStep(3)" class="rounded-xl bg-gray-200 px-5 py-2.5 text-sm text-black hover:bg-gray-300">Назад</button>
                        <button type="button" onclick="saveDraft()" class="rounded-xl bg-[#DED0BB] px-5 py-2.5 text-sm text-black hover:opacity-90">Создать</button>
                    </div>
                </div>
            `;
        }

        function renderLinkActions(link) {
            // Возвращаем блок только если есть QR-код
            if (!link.qrDataUrl) {
                return '';
            }
            
            return `
                <div class="mt-4 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-black">QR-код:</span>
                            <button onclick="downloadQR('${link.id}')" 
                                class="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600">
                                Скачать QR
                            </button>
                        </div>
                        <div class="flex justify-center rounded bg-white p-4">
                            <img src="${link.qrDataUrl}" alt="QR Code" class="h-32 w-32">
                        </div>
                    </div>
                </div>
            `;
        }

        function updateAmountMode(mode) {
            // Получаем ID текущей ссылки
            const linkId = editingLinkId || selectedLinkId;
            
            // Обновляем объект ссылки напрямую, если ссылка существует
            if (linkId) {
                const link = links.find(l => l.id === linkId);
                if (link) {
                    link.amountMode = mode;
                    // Если переключаем на свободную сумму, удаляем фиксированную сумму
                    if (mode === 'free') {
                        link.fixedAmount = undefined;
                    }
                    link.updatedAt = new Date().toISOString();
                    saveState();
                }
            } else {
                // Для новой ссылки сохраняем режим в localStorage
                if (typeof Storage !== 'undefined') {
                    localStorage.setItem('tempAmountMode', mode);
                }
            }
            
            // Обновляем скрытые radio-кнопки для формы
            const hiddenRadios = document.querySelectorAll('input[name="amountMode"]');
            if (hiddenRadios.length > 0) {
                hiddenRadios.forEach(radio => {
                    radio.checked = radio.value === mode;
                });
            } else {
                // Создаем скрытые radio-кнопки для обеих опций
                ['fixed', 'free'].forEach(value => {
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'radio';
                    hiddenInput.name = 'amountMode';
                    hiddenInput.value = value;
                    hiddenInput.checked = value === mode;
                    hiddenInput.style.display = 'none';
                    document.body.appendChild(hiddenInput);
                });
            }
            
            // Визуально обновляем кнопки напрямую
            const buttons = document.querySelectorAll('button[onclick*="updateAmountMode"]');
            buttons.forEach(button => {
                const buttonMode = button.getAttribute('onclick').includes("'fixed'") ? 'fixed' : 'free';
                if (buttonMode === mode) {
                    button.style.backgroundColor = '#DED0BB';
                    button.classList.remove('opacity-60');
                } else {
                    button.style.backgroundColor = '#F5F5F5';
                    button.classList.add('opacity-60');
                }
            });
            
            // Показываем/скрываем поле суммы напрямую (для мгновенной обратной связи)
            const fixedAmountField = document.getElementById('fixedAmountField');
            if (fixedAmountField) {
                fixedAmountField.style.display = mode === 'fixed' ? 'block' : 'none';
            }
            
            // Обновляем отображение формы для синхронизации всех элементов
            renderLinksList();
        }

        function handleFixedAmountInput(event) {
            const input = event.target;
            const cursorPosition = input.selectionStart;
            const oldValue = input.value;
            const numericValue = oldValue.replace(/\D/g, '');
            
            // Сохраняем количество цифр до курсора
            const beforeCursor = oldValue.substring(0, cursorPosition);
            const digitsBeforeCursor = beforeCursor.replace(/\D/g, '').length;
            
            // Обновляем значение с форматированием
            const formatted = formatAmount(numericValue);
            input.value = formatted;
            
            // Вычисляем новую позицию курсора
            let newCursorPosition = 0;
            let digitsCount = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) {
                    digitsCount++;
                    if (digitsCount === digitsBeforeCursor) {
                        newCursorPosition = i + 1;
                        break;
                    }
                }
            }
            // Если курсор был в конце, ставим его в конец
            if (digitsBeforeCursor >= numericValue.length) {
                newCursorPosition = formatted.length;
            }
            
            // Восстанавливаем позицию курсора после следующего кадра
            setTimeout(() => {
                input.setSelectionRange(newCursorPosition, newCursorPosition);
            }, 0);
        }

        function toggleCollectEmail() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                const draft = getCurrentFormDraft();
                draft.collectEmail = !draft.collectEmail;
                if (!draft.collectEmail) {
                    draft.emailRequired = false;
                }
                localStorage.setItem('tempCollectEmail', draft.collectEmail.toString());
                localStorage.setItem('tempEmailRequired', draft.emailRequired.toString());
                renderCreateModalContent(draft);
                return;
            }
            const link = links.find(l => l.id === linkId);
            if (link) {
                link.collectEmail = !link.collectEmail;
                if (!link.collectEmail) {
                    link.emailRequired = false;
                }
                saveState();
                renderLinksList();
                // Обновляем модальное окно, если оно открыто
                if (editingLinkId === linkId) {
                    openEditModal(linkId);
                }
            }
        }

        function toggleEmailRequired() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                const draft = getCurrentFormDraft();
                if (!draft.collectEmail) return;
                draft.emailRequired = !draft.emailRequired;
                localStorage.setItem('tempEmailRequired', draft.emailRequired.toString());
                renderCreateModalContent(draft);
                return;
            }
            const link = links.find(l => l.id === linkId);
            if (link && link.collectEmail) {
                link.emailRequired = !link.emailRequired;
                saveState();
                renderLinksList();
                // Обновляем модальное окно, если оно открыто
                if (editingLinkId === linkId) {
                    openEditModal(linkId);
                }
            }
        }

        function toggleCollectPhone() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                const draft = getCurrentFormDraft();
                draft.collectPhone = !draft.collectPhone;
                if (!draft.collectPhone) {
                    draft.phoneRequired = false;
                }
                localStorage.setItem('tempCollectPhone', draft.collectPhone.toString());
                localStorage.setItem('tempPhoneRequired', draft.phoneRequired.toString());
                renderCreateModalContent(draft);
                return;
            }
            const link = links.find(l => l.id === linkId);
            if (link) {
                link.collectPhone = !link.collectPhone;
                if (!link.collectPhone) {
                    link.phoneRequired = false;
                }
                saveState();
                renderLinksList();
                // Обновляем модальное окно, если оно открыто
                if (editingLinkId === linkId) {
                    openEditModal(linkId);
                }
            }
        }

        function togglePhoneRequired() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                const draft = getCurrentFormDraft();
                if (!draft.collectPhone) return;
                draft.phoneRequired = !draft.phoneRequired;
                localStorage.setItem('tempPhoneRequired', draft.phoneRequired.toString());
                renderCreateModalContent(draft);
                return;
            }
            const link = links.find(l => l.id === linkId);
            if (link && link.collectPhone) {
                link.phoneRequired = !link.phoneRequired;
                saveState();
                renderLinksList();
                // Обновляем модальное окно, если оно открыто
                if (editingLinkId === linkId) {
                    openEditModal(linkId);
                }
            }
        }

        function toggleCollectOrderDetails() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                const draft = getCurrentFormDraft();
                draft.collectOrderDetails = !draft.collectOrderDetails;
                if (!draft.collectOrderDetails) {
                    draft.orderDetailsRequired = false;
                }
                localStorage.setItem('tempCollectOrderDetails', draft.collectOrderDetails.toString());
                localStorage.setItem('tempOrderDetailsRequired', draft.orderDetailsRequired.toString());
                renderCreateModalContent(draft);
                return;
            }
            const link = links.find(l => l.id === linkId);
            if (link) {
                link.collectOrderDetails = !link.collectOrderDetails;
                if (!link.collectOrderDetails) {
                    link.orderDetailsRequired = false;
                }
                saveState();
                renderLinksList();
                if (editingLinkId === linkId) {
                    openEditModal(linkId);
                }
            }
        }

        function toggleOrderDetailsRequired() {
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                const draft = getCurrentFormDraft();
                if (!draft.collectOrderDetails) return;
                draft.orderDetailsRequired = !draft.orderDetailsRequired;
                localStorage.setItem('tempOrderDetailsRequired', draft.orderDetailsRequired.toString());
                renderCreateModalContent(draft);
                return;
            }
            const link = links.find(l => l.id === linkId);
            if (link && link.collectOrderDetails) {
                link.orderDetailsRequired = !link.orderDetailsRequired;
                saveState();
                renderLinksList();
                if (editingLinkId === linkId) {
                    openEditModal(linkId);
                }
            }
        }

        function updateDescCount() {
            const desc = document.getElementById('description').value;
            document.getElementById('descCount').textContent = desc.length;
        }
