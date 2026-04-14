        function saveDraft() {
            try {
                if (!editingLinkId && createWizardDraft) {
                    const draft = createWizardDraft;
                    const amountMode = draft.amountMode || 'fixed';
                    const fixedAmountValue = amountMode === 'fixed' ? parseAmount(String(draft.fixedAmount || '0')) : undefined;
                    const linkData = {
                        title: (draft.title || '').trim() || 'Платежная ссылка',
                        merchantName: draft.merchantName || 'Онлайн Школа IT',
                        linkType: draft.linkType || 'reusable',
                        amountMode,
                        fixedAmount: amountMode === 'fixed' ? fixedAmountValue : undefined,
                        description: (draft.description || '').trim(),
                        collectEmail: !!draft.collectEmail,
                        emailRequired: !!draft.emailRequired,
                        collectPhone: !!draft.collectPhone,
                        phoneRequired: !!draft.phoneRequired,
                        collectOrderDetails: !!draft.collectOrderDetails,
                        orderDetailsRequired: !!draft.orderDetailsRequired,
                        generateReceipt: !!draft.generateReceipt,
                        receiptItems: draft.generateReceipt ? (draft.receiptItems || []) : [],
                        status: 'ready'
                    };

                    if (!linkData.merchantName) {
                        showNotification('Укажите магазин');
                        return;
                    }
                    if (amountMode === 'fixed' && (!linkData.fixedAmount || linkData.fixedAmount <= 0)) {
                        showNotification('Укажите сумму больше 0 ₽');
                        return;
                    }
                    if (!linkData.description) {
                        showNotification('Добавьте описание заказа');
                        return;
                    }
                    if (linkData.generateReceipt) {
                        if (!Array.isArray(linkData.receiptItems) || linkData.receiptItems.length === 0) {
                            showNotification('Добавьте хотя бы один товар для чека');
                            return;
                        }
                        const invalidItem = linkData.receiptItems.find(item => {
                            const itemName = (item.name || '').trim();
                            const qty = Number(item.quantity);
                            const price = Number(item.price);
                            return !itemName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0;
                        });
                        if (invalidItem) {
                            showNotification('Проверьте товары в чеке: название, количество и цену');
                            return;
                        }
                    }

                    if (draft.saveAsTemplate) {
                        const templateName = (draft.templateName || '').trim();
                        if (!templateName) {
                            showNotification('Укажите название шаблона');
                            return;
                        }
                        templates.push({
                            id: `tpl-${Date.now()}`,
                            name: templateName,
                            settings: {
                                merchantName: linkData.merchantName,
                                linkType: linkData.linkType,
                                amountMode: linkData.amountMode,
                                fixedAmount: linkData.fixedAmount,
                                description: linkData.description,
                                collectEmail: linkData.collectEmail,
                                emailRequired: linkData.emailRequired,
                                collectPhone: linkData.collectPhone,
                                phoneRequired: linkData.phoneRequired,
                                collectOrderDetails: linkData.collectOrderDetails,
                                orderDetailsRequired: linkData.orderDetailsRequired,
                                generateReceipt: linkData.generateReceipt,
                                receiptItems: linkData.receiptItems
                            },
                            createdAt: new Date().toISOString()
                        });
                        saveTemplates();
                    }

                    const newLinkId = generateId();
                    const newLink = {
                        id: newLinkId,
                        ...linkData,
                        url: `payment.com/link/${newLinkId}`,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    links.push(newLink);
                    selectedLinkId = newLink.id;
                    closeModal();
                    saveState();
                    render();
                    return;
                }

                const titleEl = document.getElementById('linkTitle');
                const merchantNameEl = document.getElementById('merchantName');
                const linkTypeEl = document.querySelector('input[name="linkType"]:checked');
                const amountModeEl = document.querySelector('input[name="amountMode"]:checked');
                const fixedAmountEl = document.getElementById('fixedAmount');
                const descriptionEl = document.getElementById('description');
                const collectEmailEl = document.getElementById('collectEmail');
                const emailRequiredEl = document.getElementById('emailRequired');
                const collectPhoneEl = document.getElementById('collectPhone');
                const phoneRequiredEl = document.getElementById('phoneRequired');

                if (!merchantNameEl) {
                    console.error('Form elements not found');
                    return;
                }

                // Получаем режим суммы из скрытых radio-кнопок или из объекта ссылки
                let amountMode = 'fixed';
                if (amountModeEl) {
                    amountMode = amountModeEl.value;
                } else {
                    // Если скрытых полей нет, пытаемся получить из ссылки или localStorage
                    const linkId = editingLinkId || selectedLinkId;
                    if (linkId) {
                        const link = links.find(l => l.id === linkId);
                        if (link) {
                            amountMode = link.amountMode;
                        }
                    } else if (typeof Storage !== 'undefined') {
                        const tempMode = localStorage.getItem('tempAmountMode');
                        if (tempMode) {
                            amountMode = tempMode;
                        }
                    }
                }
                const collectEmail = collectEmailEl ? collectEmailEl.checked : false;
                const emailRequired = collectEmail && emailRequiredEl ? emailRequiredEl.checked : false;
                const collectPhone = collectPhoneEl ? collectPhoneEl.checked : false;
                const phoneRequired = collectPhone && phoneRequiredEl ? phoneRequiredEl.checked : false;
                const linkType = linkTypeEl ? linkTypeEl.value : (localStorage.getItem('tempLinkType') || 'reusable');

                // Парсим фиксированную сумму из отформатированного значения
                let fixedAmountValue = 0;
                if (amountMode === 'fixed' && fixedAmountEl) {
                    const formattedValue = fixedAmountEl.value || '';
                    fixedAmountValue = parseAmount(formattedValue);
                }

                // Получаем значения дополнительных полей из состояния ссылки или localStorage
                const linkId = editingLinkId || selectedLinkId;
                const link = linkId ? links.find(l => l.id === linkId) : null;
                let collectEmailValue, emailRequiredValue, collectPhoneValue, phoneRequiredValue, collectOrderDetailsValue, orderDetailsRequiredValue;
                let generateReceiptValue, receiptItemsValue;
                if (link) {
                    collectEmailValue = link.collectEmail || false;
                    emailRequiredValue = link.emailRequired || false;
                    collectPhoneValue = link.collectPhone || false;
                    phoneRequiredValue = link.phoneRequired || false;
                    collectOrderDetailsValue = link.collectOrderDetails || false;
                    orderDetailsRequiredValue = link.orderDetailsRequired || false;
                    generateReceiptValue = link.generateReceipt || false;
                    receiptItemsValue = Array.isArray(link.receiptItems) ? link.receiptItems : [];
                } else {
                    // При создании новой ссылки читаем из localStorage
                    collectEmailValue = localStorage.getItem('tempCollectEmail') === 'true';
                    emailRequiredValue = localStorage.getItem('tempEmailRequired') === 'true';
                    collectPhoneValue = localStorage.getItem('tempCollectPhone') === 'true';
                    phoneRequiredValue = localStorage.getItem('tempPhoneRequired') === 'true';
                    collectOrderDetailsValue = localStorage.getItem('tempCollectOrderDetails') === 'true';
                    orderDetailsRequiredValue = localStorage.getItem('tempOrderDetailsRequired') === 'true';
                    generateReceiptValue = localStorage.getItem('tempGenerateReceipt') === 'true';
                    const tempReceiptItems = localStorage.getItem('tempReceiptItems');
                    if (tempReceiptItems) {
                        try {
                            const parsedItems = JSON.parse(tempReceiptItems);
                            receiptItemsValue = Array.isArray(parsedItems) ? parsedItems : [];
                        } catch (e) {
                            receiptItemsValue = [];
                        }
                    } else {
                        receiptItemsValue = [];
                    }
                }

                const linkData = {
                    title: titleEl ? ((titleEl.value || '').trim() || 'Платежная ссылка') : 'Платежная ссылка',
                    merchantName: merchantNameEl.value || 'Онлайн Школа IT',
                    linkType: linkType,
                    amountMode: amountMode || 'fixed',
                    fixedAmount: amountMode === 'fixed' && fixedAmountValue > 0 ? fixedAmountValue : undefined,
                    description: descriptionEl ? (descriptionEl.value || undefined) : undefined,
                    collectEmail: collectEmailValue,
                    emailRequired: emailRequiredValue,
                    collectPhone: collectPhoneValue,
                    phoneRequired: phoneRequiredValue,
                    collectOrderDetails: collectOrderDetailsValue,
                    orderDetailsRequired: orderDetailsRequiredValue,
                    generateReceipt: generateReceiptValue,
                    receiptItems: generateReceiptValue ? receiptItemsValue : [],
                    createTemplate: localStorage.getItem('tempCreateTemplate') === 'true',
                    status: 'draft'
                };

                // Валидация: не даем сохранять "пустую" ссылку
                const descriptionText = (linkData.description || '').trim();
                if (!linkData.merchantName) {
                    showNotification('Укажите магазин');
                    return;
                }
                if (linkData.amountMode === 'fixed' && (!linkData.fixedAmount || linkData.fixedAmount <= 0)) {
                    showNotification('Укажите сумму больше 0 ₽');
                    return;
                }
                if (!descriptionText) {
                    showNotification('Добавьте описание заказа');
                    return;
                }

                if (linkData.generateReceipt) {
                    if (!Array.isArray(linkData.receiptItems) || linkData.receiptItems.length === 0) {
                        showNotification('Добавьте хотя бы один товар для чека');
                        return;
                    }

                    const invalidItem = linkData.receiptItems.find(item => {
                        const itemName = (item.name || '').trim();
                        const qty = Number(item.quantity);
                        const price = Number(item.price);
                        return !itemName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0;
                    });

                    if (invalidItem) {
                        showNotification('Проверьте товары в чеке: название, количество и цену');
                        return;
                    }
                }

                if (linkData.createTemplate) {
                    const templateId = `tpl-${Date.now()}`;
                    templates.push({
                        id: templateId,
                        name: `${linkData.merchantName} (${linkData.linkType === 'single' ? 'одноразовая' : 'многоразовая'})`,
                        settings: {
                            merchantName: linkData.merchantName,
                            linkType: linkData.linkType,
                            amountMode: linkData.amountMode,
                            fixedAmount: linkData.fixedAmount,
                            description: linkData.description,
                            collectEmail: linkData.collectEmail,
                            emailRequired: linkData.emailRequired,
                            collectPhone: linkData.collectPhone,
                            phoneRequired: linkData.phoneRequired,
                            collectOrderDetails: linkData.collectOrderDetails,
                            orderDetailsRequired: linkData.orderDetailsRequired,
                            generateReceipt: linkData.generateReceipt,
                            receiptItems: linkData.receiptItems
                        },
                        createdAt: new Date().toISOString()
                    });
                    saveTemplates();
                }

                const { createTemplate, ...linkPayload } = linkData;
                
                if (linkId) {
                    const link = links.find(l => l.id === linkId);
                    if (link) {
                        // При обновлении существующей ссылки сохраняем URL, если он уже был
                        const existingUrl = link.url;
                        Object.assign(link, linkPayload, { 
                            updatedAt: new Date().toISOString(),
                            url: existingUrl || link.url // Сохраняем существующий URL
                        });
                        // Обновляем selectedLinkId, если он не был установлен
                        if (!selectedLinkId) {
                            selectedLinkId = linkId;
                        }
                    }
                } else {
                    // Создаем новую ссылку - генерируем URL сразу и устанавливаем статус 'ready'
                    const newLinkId = generateId();
                    const newLink = {
                        id: newLinkId,
                        title: linkPayload.title,
                        merchantName: linkPayload.merchantName,
                        linkType: linkPayload.linkType,
                        amountMode: linkPayload.amountMode,
                        fixedAmount: linkPayload.fixedAmount,
                        description: linkPayload.description,
                        collectEmail: linkPayload.collectEmail,
                        emailRequired: linkPayload.emailRequired,
                        collectPhone: linkPayload.collectPhone,
                        phoneRequired: linkPayload.phoneRequired,
                        collectOrderDetails: linkPayload.collectOrderDetails,
                        orderDetailsRequired: linkPayload.orderDetailsRequired,
                        generateReceipt: linkPayload.generateReceipt,
                        receiptItems: linkPayload.receiptItems,
                        status: 'ready', // Новая ссылка сразу становится опубликованной
                        url: `payment.com/link/${newLinkId}`, // Генерируем URL сразу с тем же ID
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    links.push(newLink);
                    selectedLinkId = newLink.id;
                    console.log('Новая ссылка создана:', newLink);
                }
                
                // Закрываем модальное окно после сохранения
                closeModal();
                
                saveState();
                render();
                
                // Логируем успешное сохранение
                console.log('Ссылка успешно сохранена, selectedLinkId:', selectedLinkId);
                console.log('Всего ссылок в массиве:', links.length);
            } catch (error) {
                console.error('Error saving draft:', error);
            }
        }

        function generateLink() {
            // Эта функция больше не нужна, так как ссылка генерируется автоматически
            // Оставляем для обратной совместимости, но она просто сохраняет изменения
            saveDraft();
        }

        async function generateQRForCard(linkId) {
            const link = links.find(l => l.id === linkId);
            if (!link) {
                console.error('Link not found');
                return;
            }
            
            // Если URL нет, генерируем его
            if (!link.url) {
                link.url = `payment.com/link/${link.id}`;
                link.status = 'ready';
                link.updatedAt = new Date().toISOString();
                saveState();
            }
            
            // Генерируем QR код
            await generateQRForLink(link);
            // Обновляем список, чтобы показать QR код
            renderLinksList();
            // Показываем уведомление
            showNotification('QR‑код скачан');
        }

        async function generateQR() {
            // Сохраняем изменения перед генерацией QR
            saveDraft();
            
            // Небольшая задержка, чтобы данные успели сохраниться
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Используем editingLinkId, если он установлен, иначе selectedLinkId
            const linkId = editingLinkId || selectedLinkId;
            if (!linkId) {
                console.error('Link not found. Please save the link first.');
                return;
            }
            
            const link = links.find(l => l.id === linkId);
            if (!link) {
                console.error('Link not found. Please save the link first.');
                return;
            }
            
            // Если URL нет, генерируем его
            if (!link.url) {
                link.url = `payment.com/link/${link.id}`;
                link.status = 'ready';
                link.updatedAt = new Date().toISOString();
                saveState();
            }
            
            await generateQRForLink(link);
        }

        async function generateQRForLink(link) {
            if (!link || !link.url) {
                console.error('Link or URL not found');
                return;
            }
            
            try {
                const canvas = document.createElement('canvas');
                await new Promise((resolve, reject) => {
                    QRCode.toCanvas(canvas, link.url, {
                        width: 256,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }, (error) => {
                        if (error) {
                            console.error('QR code generation error:', error);
                            reject(error);
                            return;
                        }
                        resolve();
                    });
                });
                link.qrDataUrl = canvas.toDataURL('image/png');
                link.status = 'ready'; // Устанавливаем статус "Опубликована" при генерации QR
                link.updatedAt = new Date().toISOString();
                console.log('QR-код сгенерирован для ссылки:', link.id, 'qrDataUrl:', link.qrDataUrl ? 'установлен' : 'не установлен');
                saveState();
                // Обновляем список ссылок, чтобы форма редактирования обновилась и показала QR-код
                renderLinksList();
                console.log('QR-код должен отображаться в форме редактирования');
            } catch (error) {
                console.error('Error generating QR:', error);
            }
        }

        function copyUrl(linkId) {
            const link = links.find(l => l.id === linkId);
            if (link && link.url) {
                navigator.clipboard.writeText(link.url).then(() => {
                    console.log('URL скопирован в буфер обмена');
                }).catch(() => {
                    console.error('Не удалось скопировать URL');
                });
            }
        }

        function drawQRPlaceholder(ctx, x, y, size) {
            // Рисуем простой QR-код-заглушку (паттерн квадратов)
            const moduleSize = size / 23; // 23x23 модулей
            ctx.fillStyle = '#000000';
            
            // Паттерн, имитирующий QR-код
            const pattern = [
                [1,1,1,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,1,0,1,1,0,1,0,1,1,0,1,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,0,0,1,1,1,1,1,0,0,1,0,1,1,1,0,1],
                [1,0,1,1,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,1,1,0,1],
                [1,0,1,1,1,0,1,0,1,1,0,0,0,1,1,0,1,0,1,1,1,0,1],
                [1,0,0,0,0,0,1,0,1,0,1,1,1,0,1,0,1,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
                [0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
                [1,1,0,1,1,0,1,1,0,1,0,0,0,1,0,1,1,0,1,1,0,1,1],
                [0,0,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,0,0],
                [1,0,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,0,1],
                [0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0],
                [1,1,0,0,0,1,0,1,0,1,1,0,1,1,0,1,0,1,0,0,0,1,1],
                [0,0,1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1,0,0],
                [1,1,0,0,1,0,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,1],
                [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
                [1,1,1,1,1,1,1,0,1,1,0,1,0,1,1,0,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,1,0,0,0,1,1,1,1,0,0,1,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,0,1,1,0,0,0,0,1,1,0,1,0,1,1,1,0],
                [1,0,1,1,1,0,1,0,0,1,1,1,1,1,1,0,0,1,0,1,1,1,0],
                [1,0,1,1,1,0,1,0,1,0,0,0,0,0,0,1,0,1,0,1,1,1,0],
                [1,0,0,0,0,0,1,0,1,1,1,0,0,0,1,1,1,0,1,0,0,0,0],
                [1,1,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,1]
            ];
            
            for (let row = 0; row < pattern.length; row++) {
                for (let col = 0; col < pattern[row].length; col++) {
                    if (pattern[row][col] === 1) {
                        ctx.fillRect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize);
                    }
                }
            }
        }

        async function downloadQR(linkId) {
            const link = links.find(l => l.id === linkId);
            if (!link) {
                console.error('Link not found:', linkId);
                return;
            }
            
            try {
                // Размеры баннера: 800x1200px (вертикальный)
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 1200;
                const ctx = canvas.getContext('2d');
                
                // Верхняя часть - светло-бежевый фон (2/3 высоты = 800px)
                const beigeColor = '#F5F5DC';
                ctx.fillStyle = beigeColor;
                ctx.fillRect(0, 0, 800, 800);
                
                // QR код в белом квадрате с закругленными углами (центр верхней части)
                const qrSize = 400;
                const qrX = (800 - qrSize) / 2;
                const qrY = 320;
                
                // Текст "Сканируй и плати" - большой, жирный, черный (над QR кодом)
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText('Сканируй и плати', 400, 80);
                
                // Текст "В приложении своего банка" - меньший, обычный, черный
                ctx.font = 'normal 28px system-ui, -apple-system, sans-serif';
                ctx.fillText('В приложении своего банка', 400, 160);
                
                // Рисуем белый квадрат с закругленными углами для QR кода
                ctx.fillStyle = '#FFFFFF';
                const cornerRadius = 20;
                ctx.beginPath();
                ctx.moveTo(qrX + cornerRadius, qrY);
                ctx.lineTo(qrX + qrSize - cornerRadius, qrY);
                ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + cornerRadius);
                ctx.lineTo(qrX + qrSize, qrY + qrSize - cornerRadius);
                ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - cornerRadius, qrY + qrSize);
                ctx.lineTo(qrX + cornerRadius, qrY + qrSize);
                ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - cornerRadius);
                ctx.lineTo(qrX, qrY + cornerRadius);
                ctx.quadraticCurveTo(qrX, qrY, qrX + cornerRadius, qrY);
                ctx.closePath();
                ctx.fill();
                
                // Рисуем QR-код-заглушку
                drawQRPlaceholder(ctx, qrX, qrY, qrSize);
                
                // Нижняя часть - желтый фон (1/3 высоты = 400px)
                const yellowColor = '#FFDD2D';
                ctx.fillStyle = yellowColor;
                ctx.fillRect(0, 800, 800, 400);
                
                // Загружаем логотип Т-Банка
                const logoImg = new Image();
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = reject;
                    logoImg.src = tBankLogoBase64;
                });
                
                // Рисуем логотип по центру нижней части
                const logoHeight = 120;
                const logoAspectRatio = logoImg.width / logoImg.height;
                const logoWidth = logoHeight * logoAspectRatio;
                const logoX = (800 - logoWidth) / 2;
                const logoY = 800 + (400 - logoHeight) / 2;
                ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                
                // Конвертируем canvas в PNG и скачиваем
                const dataUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `qr-banner-${link.id || 'payment'}.png`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                }, 100);
                showNotification('QR-код скачан');
                
            } catch (error) {
                console.error('Failed to generate QR banner:', error);
                showNotification('Ошибка при генерации QR-кода');
            }
        }

        function toggleCopyMenu(linkId, event) {
            event.stopPropagation();
            // Закрываем все другие открытые меню
            document.querySelectorAll('[id^="copyMenu-"]').forEach(menu => {
                if (menu.id !== `copyMenu-${linkId}`) {
                    menu.classList.add('hidden');
                }
            });
            
            const menu = document.getElementById(`copyMenu-${linkId}`);
            if (menu) {
                menu.classList.toggle('hidden');
            }
        }

        function closeCopyMenu(linkId) {
            const menu = document.getElementById(`copyMenu-${linkId}`);
            if (menu) {
                menu.classList.add('hidden');
            }
        }

        // Закрываем меню при клике вне его
        document.addEventListener('click', function(event) {
            if (!event.target.closest('[id^="copyMenu-"]') && !event.target.closest('button[onclick*="toggleCopyMenu"]')) {
                document.querySelectorAll('[id^="copyMenu-"]').forEach(menu => {
                    menu.classList.add('hidden');
                });
            }
        });

        function copyLinkUrl(linkId) {
            const link = links.find(l => l.id === linkId);
            if (link && link.url) {
                navigator.clipboard.writeText(link.url).then(() => {
                    showNotification('Ссылка скопирована');
                }).catch(() => {
                    console.error('Не удалось скопировать URL');
                });
            } else if (link) {
                console.warn('Ссылка еще не сгенерирована. Нажмите кнопку "Ссылка" для генерации ссылки');
            }
        }

        function showNotification(message) {
            // Удаляем существующие уведомления
            const existingNotifications = document.querySelectorAll('.notification-toast');
            existingNotifications.forEach(notif => {
                notif.classList.add('hiding');
                setTimeout(() => notif.remove(), 300);
            });

            // Создаем новое уведомление
            const notification = document.createElement('div');
            notification.className = 'notification-toast';
            
            // Генерируем уникальный ID для градиента, чтобы избежать конфликтов
            const gradientId = 'checkGradient_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Иконка галочки из Figma (комбинированная из фона и галочки)
            const checkIcon = `
                <svg class="notification-toast-icon" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="11" fill="url(#${gradientId})"/>
                    <path d="M6 11L9.5 14.5L16 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <defs>
                        <linearGradient id="${gradientId}" x1="4" y1="4" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#0CBC37"/>
                            <stop offset="1" stop-color="#0CBC37" stop-opacity="0.65"/>
                        </linearGradient>
                    </defs>
                </svg>
            `;
            
            // Иконка крестика (встроенный SVG вместо файла)
            const closeIcon = `
                <svg class="notification-toast-close-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.02176 9.43677L12.0003 13.4152L13.4145 12.001L9.43599 8.02258L13.4586 4.00014L12.0443 2.58594L8.02176 6.60838L3.99919 2.58594L2.58496 4.00013L6.60752 8.02258L2.58701 12.043L4.00124 13.4572L8.02176 9.43677Z" fill="rgba(0, 0, 0, 0.8)"/>
                </svg>
            `;
            
            notification.innerHTML = `
                <div class="notification-toast-content">
                    <span class="notification-toast-text">${message}</span>
                    <div class="notification-toast-close" onclick="this.closest('.notification-toast').classList.add('hiding'); setTimeout(() => this.closest('.notification-toast')?.remove(), 300);">
                        ${closeIcon}
                    </div>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Автоматически скрываем через 3 секунды
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('hiding');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 3000);
        }


        async function downloadQRPDF(linkId) {
            const link = links.find(l => l.id === linkId);
            if (!link) return;

            try {
                // Если QR еще не сгенерирован, генерируем его
                if (!link.qrDataUrl && link.url) {
                    await generateQRForLink(link);
                }

                if (!link.qrDataUrl) {
                    console.warn('QR-код не найден. Сначала сгенерируйте QR-код.');
                    return;
                }

                // Создаем PDF с QR-кодом
                if (typeof window.jspdf !== 'undefined') {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    
                    // Добавляем заголовок
                    doc.setFontSize(16);
                    doc.text(link.title || 'Платёжная ссылка', 105, 20, { align: 'center' });
                    
                    // Добавляем информацию о продавце
                    doc.setFontSize(12);
                    doc.text('Продавец: ' + link.merchantName, 105, 30, { align: 'center' });
                    
                    if (link.description) {
                        doc.text(link.description, 105, 40, { align: 'center', maxWidth: 180 });
                    }
                    
                    // Добавляем QR-код
                    const img = new Image();
                    img.src = link.qrDataUrl;
                    
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const qrSize = 80;
                            const x = (210 - qrSize) / 2; // Центрируем на A4 (210mm ширина)
                            const y = 60;
                            doc.addImage(img, 'PNG', x, y, qrSize, qrSize);
                            
                            // Добавляем URL под QR
                            doc.setFontSize(10);
                            const urlY = y + qrSize + 10;
                            doc.text('URL: ' + link.url, 105, urlY, { align: 'center', maxWidth: 190 });
                            
                            // Сохраняем PDF
                            doc.save(`qr-${link.id || 'payment'}.pdf`);
                            resolve();
                        };
                        img.onerror = () => {
                            console.error('Ошибка при загрузке QR-кода');
                            resolve();
                        };
                    });
                } else {
                    // Fallback: скачиваем как PNG
                    downloadQR(linkId);
                }
            } catch (error) {
                console.error('Error generating PDF:', error);
                // Fallback: скачиваем как PNG
                if (link.qrDataUrl) {
                    downloadQR(linkId);
                }
            }
        }


        function formatAmount(value) {
            // Удаляем все нецифровые символы
            const numericValue = value.toString().replace(/\D/g, '');
            // Форматируем с пробелами для тысяч
            if (numericValue === '') return '';
            const formatted = parseInt(numericValue, 10).toLocaleString('ru-RU');
            return formatted + ' ₽';
        }

        function parseAmount(formattedValue) {
            // Удаляем все нецифровые символы и возвращаем число
            const numericValue = formattedValue.toString().replace(/\D/g, '');
            return numericValue === '' ? 0 : parseInt(numericValue, 10);
        }

        function handleAmountInput(event) {
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

        function handleCollectEmailChange() {
            // Перерисовываем форму, чтобы показать/скрыть настройку обязательности
            renderLinksList();
        }

        function handleCollectPhoneChange() {
            // Перерисовываем форму, чтобы показать/скрыть настройку обязательности
            renderLinksList();
        }


        function render() {
            renderLinksList();
            renderLinkForm();
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            render();
            const modalSaveButton = document.getElementById('modalSaveButton');
            const modalDisableButton = document.getElementById('modalDisableButton');
            if (modalSaveButton) {
                modalSaveButton.addEventListener('click', saveDraft);
            }
            if (modalDisableButton) {
                modalDisableButton.addEventListener('click', disableCurrentEditingLink);
            }
        });
