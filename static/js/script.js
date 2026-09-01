// ==========================================
// 1. PRODUCTOS POR DEFECTO Y VARIABLES GLOBALES
// ==========================================

let products = JSON.parse(localStorage.getItem('catalog_products')) || defaultProducts;
let cart = JSON.parse(localStorage.getItem('catalog_cart')) || [];
let currentModalProduct = null;
let currentModalImageIndex = 0;

// Lista temporal de imágenes en edición/creación
let currentEditingImages = [];
let selectedImageIndex = null; // Para intercambiar orden de fotos

// Variables para el control unificado de arrastre y clics/toques
let activeDragImage = null;
let dragStartX = 0;
let dragStartY = 0;
let initialX = 50;
let initialY = 50;
let totalMovedDistance = 0;

// Inicializar la vista al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    renderAdminProducts();
    updateCartUI();
    setupImageManagerUI();
});

// Helper universal para convertir formatos de posición
function getImagePositionString(img) {
    if (!img) return 'center';
    if (typeof img === 'string') return img;
    if (typeof img === 'object') {
        if (typeof img.x === 'number' && typeof img.y === 'number') {
            return `${img.x}% ${img.y}%`;
        }
        if (img.position) return img.position;
    }
    return 'center';
}

function normalizeImageObject(img) {
    if (typeof img === 'string') {
        return { url: img, x: 50, y: 50 };
    }
    if (typeof img === 'object' && img !== null) {
        let x = 50, y = 50;
        if (typeof img.x === 'number') x = img.x;
        if (typeof img.y === 'number') y = img.y;
        if (img.position) {
            if (img.position === 'top') y = 0;
            if (img.position === 'bottom') y = 100;
            if (img.position === 'left') x = 0;
            if (img.position === 'right') x = 100;
        }
        return { url: img.url || '', x: x, y: y };
    }
    return { url: '', x: 50, y: 50 };
}

// ==========================================
// 2. CÁLCULO Y RENDERIZADO DE PRODUCTOS
// ==========================================
function calculateSuggested() {
    const wholesale = parseFloat(document.getElementById('prod-wholesale-price').value) || 0;
    const units = parseInt(document.getElementById('prod-units').value) || 1;
    if (wholesale > 0 && units > 0) {
        const suggested = (wholesale / units) * 1.30;
        document.getElementById('prod-unit-price').value = suggested.toFixed(2);
    }
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">No hay productos disponibles en este momento.</p>`;
        return;
    }

    products.forEach(p => {
        let mainImg = 'https://royaltekitaly.com/articulos/imagenes/no-disponible.png';
        let mainPos = 'center';

        if (p.images && p.images.length > 0) {
            const first = p.images[0];
            mainImg = (typeof first === 'object' && first !== null) ? (first.url || mainImg) : first;
            mainPos = getImagePositionString(first);
        }

        grid.innerHTML += `
            <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col justify-between overflow-hidden group">
                <!-- Contenedor principal con mayor altura (aspect-square) para ver la foto completa -->
                <div class="product-img-container aspect-square w-full bg-orange-50 cursor-pointer overflow-hidden relative" onclick="openProductModal(${p.id})">
                    <img src="${mainImg}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" style="object-position: ${mainPos};">
                    ${p.images && p.images.length > 1 ? `<span class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">+${p.images.length - 1} fotos</span>` : ''}
                </div>
                <div class="p-4 flex flex-col flex-grow justify-between">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base mb-1 group-hover:text-orange-600 transition cursor-pointer" onclick="openProductModal(${p.id})">${p.name}</h3>
                        <p class="text-orange-600 font-extrabold text-xl mb-1">$${p.wholesalePrice.toFixed(2)} <span class="text-xs font-normal text-gray-500">(${p.units > 1 ? `Caja x${p.units}` : 'Al Mayor'})</span></p>
                        ${p.units > 1 ? `<p class="text-xs text-gray-400 mb-4">Sugerido detal: $${p.unitPrice.toFixed(2)} c/u</p>` : '<div class="mb-4"></div>'}
                    </div>
                    <button onclick="openProductModal(${p.id})" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm">
                        <i class="fa-solid fa-eye"></i>
                        <span>Ver Detalles</span>
                    </button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 3. PANEL DE ADMINISTRACIÓN Y GESTIÓN DE IMÁGENES
// ==========================================
function toggleAdminMode() {
    const panel = document.getElementById('admin-panel');
    if (!panel) return;

    // Si el panel ya está abierto, lo cerramos directamente sin pedir PIN de nuevo
    const isOpen = !panel.classList.contains('hidden');
    if (isOpen) {
        panel.classList.add('hidden');
        return;
    }

    // 🔐 PIN de administrador (Cambia "1234" por tu contraseña secreta)
    const PIN_SECRETO = "284638231"; 
    const passwordIngresada = prompt("🔐 Panel de Administración Protegido\nIngresa tu PIN de acceso:");

    // Si el usuario cancela la ventana
    if (passwordIngresada === null) {
        return;
    }

    // Validamos la contraseña
    if (passwordIngresada === PIN_SECRETO) {
        panel.classList.remove('hidden');
        renderAdminProducts();
    } else {
        alert("❌ Contraseña incorrecta. Acceso no disponible para clientes.");
    }
}

function setupImageManagerUI() {
    const urlInput = document.getElementById('prod-img-urls');
    if (!urlInput) return;

    let container = document.getElementById('admin-image-manager');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin-image-manager';
        container.className = 'mt-3 space-y-2';
        urlInput.parentNode.appendChild(container);
    }
    renderAdminImageManager();

    urlInput.addEventListener('change', () => {
        const val = urlInput.value.trim();
        if (val) {
            const newUrls = val.split(',').map(u => u.trim()).filter(u => u.length > 0);
            newUrls.forEach(url => {
                const exists = currentEditingImages.some(img => (typeof img === 'object' ? img.url : img) === url);
                if (!exists) {
                    currentEditingImages.push({ url: url, x: 50, y: 50 });
                }
            });
            urlInput.value = '';
            renderAdminImageManager();
        }
    });
}

function renderAdminImageManager() {
    const container = document.getElementById('admin-image-manager');
    if (!container) return;

    if (currentEditingImages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <i class="fa-regular fa-image text-3xl text-gray-400 mb-2"></i>
                <p class="text-xs text-gray-500">No hay imágenes cargadas aún.</p>
                <p class="text-[11px] text-gray-400 mt-1">Sube archivos o pega URLs arriba.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="space-y-3">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <label class="text-xs font-bold text-gray-700 uppercase">
                    📸 Gestor de Imágenes (${currentEditingImages.length})
                </label>
                <div class="text-[11px] text-orange-700 bg-orange-100 px-2.5 py-1 rounded-md font-semibold flex flex-col sm:flex-row gap-1 sm:gap-3">
                    <span>✋ Arrastra para encuadrar la foto</span>
                    <span>🔄 Toca/haz clic en dos fotos para intercambiar su orden</span>
                </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
    `;

    currentEditingImages.forEach((imgObj, index) => {
        const normalized = normalizeImageObject(imgObj);
        const url = normalized.url;
        const posStr = `${normalized.x}% ${normalized.y}%`;
        const isSelected = selectedImageIndex === index;

        html += `
            <div class="relative group bg-white border-2 ${isSelected ? 'border-orange-500 ring-4 ring-orange-500/20 shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-orange-300'} rounded-2xl p-2.5 transition-all duration-200 flex flex-col justify-between">
                
                <div class="relative aspect-square w-full bg-orange-50 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shadow-inner select-none"
                     onmousedown="startInteraction(event, ${index})"
                     ontouchstart="startInteraction(event, ${index})"
                     title="Arrastra para encuadrar o toca para intercambiar orden">
                    
                    <img id="preview-img-${index}" src="${url}" alt="Vista previa ${index + 1}" class="w-full h-full object-cover pointer-events-none" style="object-position: ${posStr};">
                    
                    ${isSelected ? `
                        <div class="absolute inset-0 bg-orange-500/15 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none">
                            <span class="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                                Seleccionada 🔄
                            </span>
                        </div>
                    ` : ''}

                    <span class="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-xs pointer-events-none">
                        ${index + 1}
                    </span>
                    ${index === 0 ? `<span class="absolute top-2 right-2 bg-orange-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-xs pointer-events-none">Principal</span>` : ''}
                </div>

                <div class="mt-2.5">
                    <button type="button" onclick="removeEditingImage(${index})" class="text-red-500 hover:text-red-700 text-xs font-semibold py-1 rounded hover:bg-red-50 transition w-full text-center flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-trash-can text-[11px]"></i> <span>Eliminar</span>
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

// ==========================================
// CONTROLADOR UNIFICADO: ARRASTRAR O CLIC
// ==========================================
function startInteraction(e, index) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    
    activeDragImage = index;
    totalMovedDistance = 0;
    
    const normalized = normalizeImageObject(currentEditingImages[index]);
    initialX = normalized.x;
    initialY = normalized.y;
    
    dragStartX = e.clientX || (e.touches && e.touches[0].clientX);
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY);

    window.addEventListener('mousemove', onInteractionMove);
    window.addEventListener('mouseup', stopInteraction);
    window.addEventListener('touchmove', onInteractionMove);
    window.addEventListener('touchend', stopInteraction);
}

function onInteractionMove(e) {
    if (activeDragImage === null) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;
    
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;

    totalMovedDistance = Math.abs(deltaX) + Math.abs(deltaY);

    if (totalMovedDistance > 5) {
        let newX = initialX - (deltaX / 1.2);
        let newY = initialY - (deltaY / 1.2);

        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        const imgObj = currentEditingImages[activeDragImage];
        const url = typeof imgObj === 'string' ? imgObj : imgObj.url;
        
        currentEditingImages[activeDragImage] = { url: url, x: Math.round(newX), y: Math.round(newY) };

        const imgElement = document.getElementById(`preview-img-${activeDragImage}`);
        if (imgElement) {
            imgElement.style.objectPosition = `${Math.round(newX)}% ${Math.round(newY)}%`;
        }
    }
}

function stopInteraction() {
    if (activeDragImage !== null) {
        if (totalMovedDistance <= 5) {
            handleImageSelect(activeDragImage);
        } else {
            renderAdminImageManager();
        }
    }
    activeDragImage = null;
    window.removeEventListener('mousemove', onInteractionMove);
    window.removeEventListener('mouseup', stopInteraction);
    window.removeEventListener('touchmove', onInteractionMove);
    window.removeEventListener('touchend', stopInteraction);
}

function handleImageSelect(index) {
    if (selectedImageIndex === null) {
        selectedImageIndex = index;
    } else if (selectedImageIndex === index) {
        selectedImageIndex = null;
    } else {
        const temp = currentEditingImages[selectedImageIndex];
        currentEditingImages[selectedImageIndex] = currentEditingImages[index];
        currentEditingImages[index] = temp;
        selectedImageIndex = null;
    }
    renderAdminImageManager();
}

function removeEditingImage(index) {
    currentEditingImages.splice(index, 1);
    if (selectedImageIndex === index) selectedImageIndex = null;
    else if (selectedImageIndex > index) selectedImageIndex--;
    renderAdminImageManager();
}

async function saveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('prod-name').value;
    const wholesalePrice = parseFloat(document.getElementById('prod-wholesale-price').value);
    const units = parseInt(document.getElementById('prod-units').value);
    const unitPrice = parseFloat(document.getElementById('prod-unit-price').value);
    const fileInput = document.getElementById('prod-files');

    if (fileInput && fileInput.files.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files[]', fileInput.files[i]);
        }

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.urls) {
                data.urls.forEach(u => currentEditingImages.push({ url: u, x: 50, y: 50 }));
            }
        } catch (error) {
            console.error('Error al subir las imágenes:', error);
            alert('Hubo un error al subir las imágenes locales.');
            return;
        }
    }

    if (currentEditingImages.length === 0) {
        currentEditingImages = [{ url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=600&auto=format&fit=crop", x: 50, y: 50 }];
    }

    const finalImages = currentEditingImages.map(img => normalizeImageObject(img));

    if (editId) {
        products = products.map(p => {
            if (p.id == editId) {
                return { ...p, name, wholesalePrice, units, unitPrice, images: finalImages };
            }
            return p;
        });
        alert('¡Producto actualizado con éxito!');
    } else {
        const newProduct = {
            id: Date.now(),
            name,
            wholesalePrice,
            units,
            unitPrice,
            images: finalImages
        };
        products.push(newProduct);
        alert('¡Producto creado con éxito!');
    }

    localStorage.setItem('catalog_products', JSON.stringify(products));
    renderProducts();
    renderAdminProducts();
    resetForm();
}

function renderAdminProducts() {
    const listContainer = document.getElementById('admin-product-list');
    const countSpan = document.getElementById('admin-product-count');
    if (!listContainer) return;
    
    if (countSpan) countSpan.innerText = products.length;
    listContainer.innerHTML = '';

    products.forEach(p => {
        let mainImg = '';
        let mainPos = 'center';
        if (p.images && p.images.length > 0) {
            const first = p.images[0];
            mainImg = (typeof first === 'object' && first !== null) ? (first.url || '') : first;
            mainPos = getImagePositionString(first);
        }

        listContainer.innerHTML += `
            <div class="bg-white border border-orange-100 p-3.5 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition-all">
                <div class="flex items-center space-x-3">
                    <img src="${mainImg}" alt="" class="w-12 h-12 object-cover rounded-xl border border-orange-200 shadow-xs" style="object-position: ${mainPos};">
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm line-clamp-1">${p.name}</h4>
                        <p class="text-xs text-orange-600 font-extrabold mt-0.5">$${p.wholesalePrice.toFixed(2)} <span class="text-gray-400 font-normal">(${p.units > 1 ? `Caja x${p.units}` : 'Al Mayor'})</span></p>
                    </div>
                </div>
                <div class="flex items-center space-x-1.5">
                    <button onclick="editProduct(${p.id})" class="bg-amber-50 hover:bg-amber-100 text-amber-600 w-8 h-8 rounded-xl flex items-center justify-center transition text-xs" title="Editar producto"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteProduct(${p.id})" class="bg-red-50 hover:bg-red-100 text-red-500 w-8 h-8 rounded-xl flex items-center justify-center transition text-xs" title="Eliminar producto"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

function editProduct(id) {
    const p = products.find(item => item.id == id);
    if (!p) return;

    document.getElementById('edit-prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-wholesale-price').value = p.wholesalePrice;
    document.getElementById('prod-units').value = p.units;
    document.getElementById('prod-unit-price').value = p.unitPrice;
    
    currentEditingImages = p.images ? p.images.map(img => normalizeImageObject(img)) : [];
    selectedImageIndex = null;
    renderAdminImageManager();

    document.getElementById('form-submit-btn').innerHTML = `<i class="fa-solid fa-save mr-1"></i> <span>Actualizar Producto</span>`;
    document.getElementById('form-cancel-btn').classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        products = products.filter(p => p.id != id);
        localStorage.setItem('catalog_products', JSON.stringify(products));
        renderProducts();
        renderAdminProducts();
    }
}

function resetForm() {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    document.getElementById('edit-prod-id').value = '';
    currentEditingImages = [];
    selectedImageIndex = null;
    renderAdminImageManager();
    document.getElementById('form-submit-btn').innerHTML = `<i class="fa-solid fa-plus mr-1"></i> <span>Guardar Producto</span>`;
    document.getElementById('form-cancel-btn').classList.add('hidden');
}

// ==========================================
// 4. MODAL, GALERÍA Y MULTIPLICADOR DE CANTIDAD
// ==========================================
function openProductModal(id) {
    const p = products.find(item => item.id == id);
    if (!p) return;
    currentModalProduct = p;
    currentModalImageIndex = 0;

    document.getElementById('modal-title').innerText = p.name;
    document.getElementById('modal-units-badge').innerText = p.units > 1 ? `Caja de ${p.units} unidades` : `Presentación al Mayor`;

    const mainImgContainer = document.getElementById('modal-main-img-container');
    const mainImg = document.getElementById('modal-main-img');
    const thumbsContainer = document.getElementById('modal-thumbs');
    
    let hasImages = p.images && p.images.length > 0;

    if (hasImages) {
        const firstImgObj = p.images[0];
        const mainUrl = (typeof firstImgObj === 'object' && firstImgObj !== null) ? (firstImgObj.url || '') : firstImgObj;
        const mainPos = typeof getImagePositionString === 'function' ? getImagePositionString(firstImgObj) : 'center';

        if (mainUrl) {
            mainImg.src = mainUrl;
            mainImg.style.display = 'block';
            mainImg.style.objectPosition = mainPos;
            
            // Remover icono vacío si existía previamente
            const oldIcon = mainImgContainer.querySelector('.modal-empty-icon');
            if (oldIcon) oldIcon.remove();
        } else {
            showEmptyModalMainImage(mainImgContainer, mainImg);
        }

        // Renderizar miniaturas
        thumbsContainer.innerHTML = '';
        p.images.forEach((imgObj, index) => {
            const u = (typeof imgObj === 'object' && imgObj !== null) ? (imgObj.url || '') : imgObj;
            const pos = typeof getImagePositionString === 'function' ? getImagePositionString(imgObj) : 'center';
            
            if (u) {
                thumbsContainer.innerHTML += `
                    <img src="${u}" alt="" style="object-position: ${pos};" onclick="switchModalImg('${u}', '${pos}', ${index})" class="w-16 h-16 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-all duration-200 border-2 ${index === 0 ? 'thumb-active ring-2 ring-orange-500' : 'border-transparent'}">
                `;
            } else {
                thumbsContainer.innerHTML += `
                    <div onclick="switchModalImg('', 'center', ${index})" class="w-16 h-16 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-center justify-center text-orange-400 cursor-pointer ${index === 0 ? 'ring-2 ring-orange-500' : 'border-transparent'}">
                        <i class="fa-solid fa-box-open text-sm"></i>
                    </div>
                `;
            }
        });
    } else {
        showEmptyModalMainImage(mainImgContainer, mainImg);
        thumbsContainer.innerHTML = '';
    }

    const saleContainer = document.getElementById('modal-sale-container');
    if (saleContainer) {
        saleContainer.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3">
                <div class="flex justify-between items-center text-sm">
                    <span class="font-semibold text-gray-700">Precio unitario / caja:</span>
                    <span class="font-bold text-gray-700">$${Number(p.wholesalePrice || 0).toFixed(2)}</span>
                </div>
                ${p.units > 1 ? `
                    <div class="text-xs text-gray-500 border-t border-orange-200/60 pt-2 flex justify-between items-center">
                        <span>💡 Sugerido reventa:</span>
                        <span class="font-bold text-gray-700">$${Number(p.unitPrice || 0).toFixed(2)} c/u</span>
                    </div>
                ` : ''}

                <div class="flex justify-between items-center border-t border-orange-200 pt-3">
                    <span class="text-sm font-bold text-gray-800">Total a Pagar:</span>
                    <span id="modal-total-price" class="text-2xl font-extrabold text-orange-600">$${Number(p.wholesalePrice || 0).toFixed(2)}</span>
                </div>

                <div class="pt-2 flex items-center justify-between border-t border-orange-200">
                    <span class="text-sm font-semibold text-gray-700">Cantidad:</span>
                    <div class="flex items-center border border-orange-300 rounded-xl bg-white overflow-hidden shadow-sm">
                        <button type="button" onclick="decrementModalQty()" class="px-3.5 py-2 text-orange-600 hover:bg-orange-100 transition font-bold">-</button>
                        <input type="number" id="modal-qty" value="1" min="1" oninput="updateModalTotal()" class="w-12 text-center text-gray-800 font-semibold focus:outline-none bg-transparent">
                        <button type="button" onclick="incrementModalQty()" class="px-3.5 py-2 text-orange-600 hover:bg-orange-100 transition font-bold">+</button>
                    </div>
                </div>

                <button onclick="addCurrentProductToCart(${p.id})" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm mt-2">
                    <i class="fa-solid fa-cart-plus"></i>
                    <span>Agregar al Pedido</span>
                </button>
            </div>
        `;
    }

    document.getElementById('product-modal').classList.remove('hidden');
}

// Función auxiliar para mostrar el icono vacío en el modal principal si no hay foto
function showEmptyModalMainImage(container, imgElement) {
    imgElement.style.display = 'none';
    const existing = container.querySelector('.modal-empty-icon');
    if (!existing) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'modal-empty-icon absolute inset-0 flex flex-col items-center justify-center text-orange-400 bg-orange-50';
        iconDiv.innerHTML = `
            <i class="fa-solid fa-box-open text-5xl mb-2"></i>
            <span class="text-xs font-semibold text-gray-400">Sin imagen registrada</span>
        `;
        container.appendChild(iconDiv);
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentModalProduct = null;
}

function updateModalTotal() {
    if (!currentModalProduct) return;
    const qtyInput = document.getElementById('modal-qty');
    const totalSpan = document.getElementById('modal-total-price');
    if (qtyInput && totalSpan) {
        let qty = parseInt(qtyInput.value) || 1;
        if (qty < 1) qty = 1;
        const total = (currentModalProduct.wholesalePrice || 0) * qty;
        totalSpan.innerText = `$${total.toFixed(2)}`;
    }
}

function incrementModalQty() {
    const input = document.getElementById('modal-qty');
    if (input) {
        input.value = parseInt(input.value || 1) + 1;
        updateModalTotal();
    }
}

function decrementModalQty() {
    const input = document.getElementById('modal-qty');
    if (input) {
        let val = parseInt(input.value || 1);
        if (val > 1) {
            input.value = val - 1;
            updateModalTotal();
        }
    }
}

function addCurrentProductToCart(productId) {
    const product = products.find(item => item.id == productId);
    if (!product) return;

    const qtyInput = document.getElementById('modal-qty');
    const quantity = parseInt(qtyInput ? qtyInput.value : 1) || 1;

    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.qty += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.wholesalePrice,
            qty: quantity,
            units: product.units
        });
    }

    localStorage.setItem('catalog_cart', JSON.stringify(cart));
    updateCartUI();
    closeProductModal();
    toggleCart(); 
}

function switchModalImg(url, position, index) {
    currentModalImageIndex = index;
    const mainImg = document.getElementById('modal-main-img');
    const mainImgContainer = document.getElementById('modal-main-img-container');
    
    mainImg.classList.add('opacity-0', 'scale-95');

    setTimeout(() => {
        if (url) {
            const oldIcon = mainImgContainer.querySelector('.modal-empty-icon');
            if (oldIcon) oldIcon.remove();
            
            mainImg.style.display = 'block';
            mainImg.src = url;
            mainImg.style.objectPosition = position;
        } else {
            mainImg.style.display = 'none';
            showEmptyModalMainImage(mainImgContainer, mainImg);
        }
        mainImg.classList.remove('opacity-0', 'scale-95');
    }, 150);

    document.querySelectorAll('#modal-thumbs img, #modal-thumbs div').forEach((thumb, idx) => {
        if (idx === index) {
            thumb.classList.add('ring-2', 'ring-orange-500');
            thumb.classList.remove('border-transparent');
        } else {
            thumb.classList.remove('ring-2', 'ring-orange-500');
            thumb.classList.add('border-transparent');
        }
    });
}

function nextModalImg() {
    if (!currentModalProduct || !currentModalProduct.images || currentModalProduct.images.length <= 1) return;
    const newIndex = (currentModalImageIndex + 1) % currentModalProduct.images.length;
    const imgObj = currentModalProduct.images[newIndex];
    const url = (typeof imgObj === 'object' && imgObj !== null) ? (imgObj.url || '') : imgObj;
    const pos = typeof getImagePositionString === 'function' ? getImagePositionString(imgObj) : 'center';
    switchModalImg(url, pos, newIndex);
}

function prevModalImg() {
    if (!currentModalProduct || !currentModalProduct.images || currentModalProduct.images.length <= 1) return;
    const newIndex = (currentModalImageIndex - 1 + currentModalProduct.images.length) % currentModalProduct.images.length;
    const imgObj = currentModalProduct.images[newIndex];
    const url = (typeof imgObj === 'object' && imgObj !== null) ? (imgObj.url || '') : imgObj;
    const pos = typeof getImagePositionString === 'function' ? getImagePositionString(imgObj) : 'center';
    switchModalImg(url, pos, newIndex);
}

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('product-modal');
    if (!modal || modal.classList.contains('hidden') || !currentModalProduct) return;

    if (e.key === 'ArrowRight') {
        nextModalImg();
    } else if (e.key === 'ArrowLeft') {
        prevModalImg();
    }
});

function openLightbox() {
    const mainImg = document.getElementById('modal-main-img');
    if (!mainImg || mainImg.style.display === 'none' || !mainImg.src) return;
    
    document.getElementById('lightbox-img').src = mainImg.src;
    document.getElementById('image-lightbox').classList.remove('hidden');
}

function closeLightbox() {
    document.getElementById('image-lightbox').classList.add('hidden');
}

// ==========================================
// 0. PRODUCTOS INICIALES POR DEFECTO
// ==========================================
const defaultProducts = [
    {
        id: 1,
        name: "Bocadillo de Guayaba Artesanal (Caja)",
        wholesalePrice: 15.00,
        units: 12,
        unitPrice: 1.50,
        images: [
            { url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=600&auto=format&fit=crop", x: 50, y: 50 }
        ]
    },
    {
        id: 2,
        name: "Dulce de Leche de Cabra",
        wholesalePrice: 18.00,
        units: 6,
        unitPrice: 3.80,
        images: [
            { url: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=600&auto=format&fit=crop", x: 50, y: 50 }
        ]
    }
];

// ==========================================
// 1. VARIABLES GLOBALES Y SETUP INICIAL
// ==========================================
let products = JSON.parse(localStorage.getItem('catalog_products')) || defaultProducts;
let cart = JSON.parse(localStorage.getItem('catalog_cart')) || [];
let currentModalProduct = null;
let currentModalImageIndex = 0;

let currentEditingImages = [];
let selectedImageIndex = null;

let activeDragImage = null;
let dragStartX = 0;
let dragStartY = 0;
let initialX = 50;
let initialY = 50;
let totalMovedDistance = 0;

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    renderAdminProducts();
    updateCartUI();
    setupImageManagerUI();
});

function getImagePositionString(img) {
    if (!img) return 'center';
    if (typeof img === 'string') return img;
    if (typeof img === 'object') {
        if (typeof img.x === 'number' && typeof img.y === 'number') {
            return `${img.x}% ${img.y}%`;
        }
        if (img.position) return img.position;
    }
    return 'center';
}

function normalizeImageObject(img) {
    if (typeof img === 'string') {
        return { url: img, x: 50, y: 50 };
    }
    if (typeof img === 'object' && img !== null) {
        let x = 50, y = 50;
        if (typeof img.x === 'number') x = img.x;
        if (typeof img.y === 'number') y = img.y;
        return { url: img.url || '', x: x, y: y };
    }
    return { url: '', x: 50, y: 50 };
}

// ==========================================
// 2. RENDERIZADO DE PRODUCTOS EN TIENDA
// ==========================================
function calculateSuggested() {
    const wholesale = parseFloat(document.getElementById('prod-wholesale-price').value) || 0;
    const units = parseInt(document.getElementById('prod-units').value) || 1;
    if (wholesale > 0 && units > 0) {
        const suggested = (wholesale / units) * 1.30;
        document.getElementById('prod-unit-price').value = suggested.toFixed(2);
    }
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">No hay productos disponibles en este momento.</p>`;
        return;
    }

    products.forEach(p => {
        let mainImg = 'https://royaltekitaly.com/articulos/imagenes/no-disponible.png';
        let mainPos = 'center';

        if (p.images && p.images.length > 0) {
            const first = p.images[0];
            mainImg = (typeof first === 'object' && first !== null) ? (first.url || mainImg) : first;
            mainPos = getImagePositionString(first);
        }

        grid.innerHTML += `
            <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col justify-between overflow-hidden group">
                <div class="product-img-container aspect-square w-full bg-orange-50 cursor-pointer overflow-hidden relative" onclick="openProductModal(${p.id})">
                    <img src="${mainImg}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" style="object-position: ${mainPos};">
                    ${p.images && p.images.length > 1 ? `<span class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">+${p.images.length - 1} fotos</span>` : ''}
                </div>
                <div class="p-4 flex flex-col flex-grow justify-between">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base mb-1 group-hover:text-orange-600 transition cursor-pointer" onclick="openProductModal(${p.id})">${p.name}</h3>
                        <p class="text-orange-600 font-extrabold text-xl mb-1">$${p.wholesalePrice.toFixed(2)} <span class="text-xs font-normal text-gray-500">(${p.units > 1 ? `Caja x${p.units}` : 'Al Mayor'})</span></p>
                        ${p.units > 1 ? `<p class="text-xs text-gray-400 mb-4">Sugerido detal: $${p.unitPrice.toFixed(2)} c/u</p>` : '<div class="mb-4"></div>'}
                    </div>
                    <button onclick="openProductModal(${p.id})" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm">
                        <i class="fa-solid fa-eye"></i>
                        <span>Ver Detalles</span>
                    </button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 3. ADMINISTRACIÓN Y GESTIÓN DE IMÁGENES
// ==========================================
function toggleAdminMode() {
    const panel = document.getElementById('admin-panel');
    if (!panel) return;

    const isOpen = !panel.classList.contains('hidden');
    if (isOpen) {
        panel.classList.add('hidden');
        return;
    }

    const PIN_SECRETO = "284638231"; 
    const passwordIngresada = prompt("🔐 Panel de Administración Protegido\nIngresa tu PIN de acceso:");

    if (passwordIngresada === null) return;

    if (passwordIngresada === PIN_SECRETO) {
        panel.classList.remove('hidden');
        renderAdminProducts();
    } else {
        alert("❌ Contraseña incorrecta.");
    }
}

function setupImageManagerUI() {
    const urlInput = document.getElementById('prod-img-urls');
    if (!urlInput) return;

    let container = document.getElementById('admin-image-manager');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin-image-manager';
        container.className = 'mt-3 space-y-2';
        urlInput.parentNode.appendChild(container);
    }
    renderAdminImageManager();

    urlInput.addEventListener('change', () => {
        const val = urlInput.value.trim();
        if (val) {
            const newUrls = val.split(',').map(u => u.trim()).filter(u => u.length > 0);
            newUrls.forEach(url => {
                const exists = currentEditingImages.some(img => (typeof img === 'object' ? img.url : img) === url);
                if (!exists) {
                    currentEditingImages.push({ url: url, x: 50, y: 50 });
                }
            });
            urlInput.value = '';
            renderAdminImageManager();
        }
    });
}

function renderAdminImageManager() {
    const container = document.getElementById('admin-image-manager');
    if (!container) return;

    if (currentEditingImages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <i class="fa-regular fa-image text-3xl text-gray-400 mb-2"></i>
                <p class="text-xs text-gray-500">No hay imágenes cargadas aún.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="space-y-3"><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">`;

    currentEditingImages.forEach((imgObj, index) => {
        const normalized = normalizeImageObject(imgObj);
        const url = normalized.url;
        const posStr = `${normalized.x}% ${normalized.y}%`;
        const isSelected = selectedImageIndex === index;

        html += `
            <div class="relative group bg-white border-2 ${isSelected ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-gray-200'} rounded-2xl p-2.5 flex flex-col justify-between">
                <div class="relative aspect-square w-full bg-orange-50 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
                     onmousedown="startInteraction(event, ${index})"
                     ontouchstart="startInteraction(event, ${index})">
                    <img id="preview-img-${index}" src="${url}" class="w-full h-full object-cover pointer-events-none" style="object-position: ${posStr};">
                    <span class="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">${index + 1}</span>
                </div>
                <div class="mt-2.5">
                    <button type="button" onclick="removeEditingImage(${index})" class="text-red-500 text-xs font-semibold py-1 w-full text-center hover:bg-red-50 rounded">Eliminar</button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function startInteraction(e, index) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    activeDragImage = index;
    totalMovedDistance = 0;
    const normalized = normalizeImageObject(currentEditingImages[index]);
    initialX = normalized.x;
    initialY = normalized.y;
    dragStartX = e.clientX || (e.touches && e.touches[0].clientX);
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY);

    window.addEventListener('mousemove', onInteractionMove);
    window.addEventListener('mouseup', stopInteraction);
    window.addEventListener('touchmove', onInteractionMove);
    window.addEventListener('touchend', stopInteraction);
}

function onInteractionMove(e) {
    if (activeDragImage === null) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;
    
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    totalMovedDistance = Math.abs(deltaX) + Math.abs(deltaY);

    if (totalMovedDistance > 5) {
        let newX = Math.max(0, Math.min(100, initialX - (deltaX / 1.2)));
        let newY = Math.max(0, Math.min(100, initialY - (deltaY / 1.2)));
        const imgObj = currentEditingImages[activeDragImage];
        currentEditingImages[activeDragImage] = { url: typeof imgObj === 'string' ? imgObj : imgObj.url, x: Math.round(newX), y: Math.round(newY) };
        const imgElement = document.getElementById(`preview-img-${activeDragImage}`);
        if (imgElement) imgElement.style.objectPosition = `${Math.round(newX)}% ${Math.round(newY)}%`;
    }
}

function stopInteraction() {
    if (activeDragImage !== null) {
        if (totalMovedDistance <= 5) {
            handleImageSelect(activeDragImage);
        } else {
            renderAdminImageManager();
        }
    }
    activeDragImage = null;
    window.removeEventListener('mousemove', onInteractionMove);
    window.removeEventListener('mouseup', stopInteraction);
    window.removeEventListener('touchmove', onInteractionMove);
    window.removeEventListener('touchend', stopInteraction);
}

function handleImageSelect(index) {
    if (selectedImageIndex === null) {
        selectedImageIndex = index;
    } else if (selectedImageIndex === index) {
        selectedImageIndex = null;
    } else {
        const temp = currentEditingImages[selectedImageIndex];
        currentEditingImages[selectedImageIndex] = currentEditingImages[index];
        currentEditingImages[index] = temp;
        selectedImageIndex = null;
    }
    renderAdminImageManager();
}

function removeEditingImage(index) {
    currentEditingImages.splice(index, 1);
    if (selectedImageIndex === index) selectedImageIndex = null;
    renderAdminImageManager();
}

async function saveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('prod-name').value;
    const wholesalePrice = parseFloat(document.getElementById('prod-wholesale-price').value);
    const units = parseInt(document.getElementById('prod-units').value);
    const unitPrice = parseFloat(document.getElementById('prod-unit-price').value);

    if (currentEditingImages.length === 0) {
        currentEditingImages = [{ url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=600&auto=format&fit=crop", x: 50, y: 50 }];
    }

    const finalImages = currentEditingImages.map(img => normalizeImageObject(img));

    if (editId) {
        products = products.map(p => p.id == editId ? { ...p, name, wholesalePrice, units, unitPrice, images: finalImages } : p);
        alert('¡Producto actualizado!');
    } else {
        products.push({ id: Date.now(), name, wholesalePrice, units, unitPrice, images: finalImages });
        alert('¡Producto creado!');
    }

    localStorage.setItem('catalog_products', JSON.stringify(products));
    renderProducts();
    renderAdminProducts();
    resetForm();
}

function renderAdminProducts() {
    const listContainer = document.getElementById('admin-product-list');
    const countSpan = document.getElementById('admin-product-count');
    if (!listContainer) return;
    if (countSpan) countSpan.innerText = products.length;
    listContainer.innerHTML = '';

    products.forEach(p => {
        let mainImg = '';
        let mainPos = 'center';
        if (p.images && p.images.length > 0) {
            const first = p.images[0];
            mainImg = (typeof first === 'object' && first !== null) ? (first.url || '') : first;
            mainPos = getImagePositionString(first);
        }

        listContainer.innerHTML += `
            <div class="bg-white border border-orange-100 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                <div class="flex items-center space-x-3">
                    <img src="${mainImg}" class="w-12 h-12 object-cover rounded-xl" style="object-position: ${mainPos};">
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm">${p.name}</h4>
                        <p class="text-xs text-orange-600 font-extrabold">$${p.wholesalePrice.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-1.5">
                    <button onclick="editProduct(${p.id})" class="bg-amber-50 text-amber-600 w-8 h-8 rounded-xl flex items-center justify-center text-xs"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteProduct(${p.id})" class="bg-red-50 text-red-500 w-8 h-8 rounded-xl flex items-center justify-center text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

function editProduct(id) {
    const p = products.find(item => item.id == id);
    if (!p) return;
    document.getElementById('edit-prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-wholesale-price').value = p.wholesalePrice;
    document.getElementById('prod-units').value = p.units;
    document.getElementById('prod-unit-price').value = p.unitPrice;
    currentEditingImages = p.images ? p.images.map(img => normalizeImageObject(img)) : [];
    selectedImageIndex = null;
    renderAdminImageManager();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
    if (confirm('¿Eliminar producto?')) {
        products = products.filter(p => p.id != id);
        localStorage.setItem('catalog_products', JSON.stringify(products));
        renderProducts();
        renderAdminProducts();
    }
}

function resetForm() {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    document.getElementById('edit-prod-id').value = '';
    currentEditingImages = [];
    selectedImageIndex = null;
    renderAdminImageManager();
}

// ==========================================
// 4. MODAL Y DETALLES DE PRODUCTO
// ==========================================
function openProductModal(id) {
    const p = products.find(item => item.id == id);
    if (!p) return;
    currentModalProduct = p;
    currentModalImageIndex = 0;

    document.getElementById('modal-title').innerText = p.name;
    document.getElementById('modal-units-badge').innerText = p.units > 1 ? `Caja de ${p.units} unidades` : `Presentación al Mayor`;

    const mainImg = document.getElementById('modal-main-img');
    const thumbsContainer = document.getElementById('modal-thumbs');
    
    if (p.images && p.images.length > 0) {
        const first = p.images[0];
        mainImg.src = (typeof first === 'object' && first !== null) ? first.url : first;
        mainImg.style.objectPosition = getImagePositionString(first);
        mainImg.style.display = 'block';

        thumbsContainer.innerHTML = '';
        p.images.forEach((imgObj, index) => {
            const u = (typeof imgObj === 'object' && imgObj !== null) ? imgObj.url : imgObj;
            const pos = getImagePositionString(imgObj);
            thumbsContainer.innerHTML += `<img src="${u}" style="object-position: ${pos};" onclick="switchModalImg('${u}', '${pos}', ${index})" class="w-16 h-16 object-cover rounded-xl cursor-pointer border-2 ${index === 0 ? 'ring-2 ring-orange-500' : 'border-transparent'}">`;
        });
    }

    const saleContainer = document.getElementById('modal-sale-container');
    if (saleContainer) {
        saleContainer.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3">
                <div class="flex justify-between items-center text-sm">
                    <span class="font-semibold text-gray-700">Precio unitario / caja:</span>
                    <span class="font-bold text-gray-700">$${Number(p.wholesalePrice || 0).toFixed(2)}</span>
                </div>
                <div class="flex justify-between items-center border-t border-orange-200 pt-3">
                    <span class="text-sm font-bold text-gray-800">Total a Pagar:</span>
                    <span id="modal-total-price" class="text-2xl font-extrabold text-orange-600">$${Number(p.wholesalePrice || 0).toFixed(2)}</span>
                </div>
                <div class="pt-2 flex items-center justify-between border-t border-orange-200">
                    <span class="text-sm font-semibold text-gray-700">Cantidad:</span>
                    <div class="flex items-center border border-orange-300 rounded-xl bg-white overflow-hidden">
                        <button type="button" onclick="decrementModalQty()" class="px-3.5 py-2 text-orange-600 font-bold">-</button>
                        <input type="number" id="modal-qty" value="1" min="1" oninput="updateModalTotal()" class="w-12 text-center text-gray-800 font-semibold bg-transparent">
                        <button type="button" onclick="incrementModalQty()" class="px-3.5 py-2 text-orange-600 font-bold">+</button>
                    </div>
                </div>
                <button onclick="addCurrentProductToCart(${p.id})" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 mt-2">
                    <i class="fa-solid fa-cart-plus"></i>
                    <span>Agregar al Pedido</span>
                </button>
            </div>
        `;
    }
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    currentModalProduct = null;
}

function updateModalTotal() {
    if (!currentModalProduct) return;
    const qtyInput = document.getElementById('modal-qty');
    const totalSpan = document.getElementById('modal-total-price');
    if (qtyInput && totalSpan) {
        let qty = parseInt(qtyInput.value) || 1;
        totalSpan.innerText = `$${((currentModalProduct.wholesalePrice || 0) * qty).toFixed(2)}`;
    }
}

function incrementModalQty() {
    const input = document.getElementById('modal-qty');
    if (input) { input.value = parseInt(input.value || 1) + 1; updateModalTotal(); }
}

function decrementModalQty() {
    const input = document.getElementById('modal-qty');
    if (input && parseInt(input.value || 1) > 1) { input.value = parseInt(input.value) - 1; updateModalTotal(); }
}

function addCurrentProductToCart(productId) {
    const product = products.find(item => item.id == productId);
    if (!product) return;
    const quantity = parseInt(document.getElementById('modal-qty')?.value || 1);
    const existing = cart.find(item => item.id == productId);
    if (existing) { existing.qty += quantity; } else {
        cart.push({ id: product.id, name: product.name, price: product.wholesalePrice, qty: quantity, units: product.units });
    }
    localStorage.setItem('catalog_cart', JSON.stringify(cart));
    updateCartUI();
    closeProductModal();
    toggleCart();
}

function switchModalImg(url, position, index) {
    currentModalImageIndex = index;
    const mainImg = document.getElementById('modal-main-img');
    mainImg.src = url;
    mainImg.style.objectPosition = position;
}

// ==========================================
// 5. CARRITO Y WHATSAPP
// ==========================================
function toggleCart() {
    const cartModal = document.getElementById('cart-drawer') || document.getElementById('cart-modal');
    if (cartModal) cartModal.classList.toggle('hidden');
    updateCartUI();
}

function abrirPanelPedido() { toggleCart(); }
function abrirCarrito() { abrirPanelPedido(); }

function vaciarCarrito() {
    cart = [];
    localStorage.setItem('catalog_cart', JSON.stringify([]));
    localStorage.setItem('cart', JSON.stringify([]));
    updateCartUI();
}

function sendWhatsApp() {
    const activeCart = getActiveCartItems();
    if (!activeCart || activeCart.length === 0) { alert('Agrega al menos un producto.'); return; }
    const name = document.getElementById('client-name')?.value.trim() || '';
    const address = document.getElementById('client-address')?.value.trim() || '';
    if (!name || !address) { alert('Completa tu nombre y dirección.'); return; }

    let message = `Hola, quiero realizar el siguiente pedido:%0A%0A👤 *Cliente:* ${name}%0A📍 *Dirección:* ${address}%0A%0A📋 *Detalle del Pedido:*%0A`;
    let total = 0;
    activeCart.forEach(item => {
        let sub = (item.price || 0) * (item.qty || 1);
        total += sub;
        message += `- ${item.qty}x ${item.name} ($${sub.toFixed(2)})%0A`;
    });
    message += `%0A💰 *Total a Pagar:* $${total.toFixed(2)}`;
    window.open(`https://wa.me/584127305103?text=${message}`, '_blank');
}

function shareCatalogWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('¡Hola! 👋 Te comparto nuestro catálogo completo de dulces artesanales al mayor.')}`, '_blank');
}

function getActiveCartItems() {
    if (cart && cart.length > 0) return cart;
    try {
        const stored = localStorage.getItem('catalog_cart') || localStorage.getItem('cart');
        if (stored) cart = JSON.parse(stored);
    } catch(e) { cart = []; }
    return Array.isArray(cart) ? cart : [];
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    const currentCart = getActiveCartItems();
    if (badge) badge.innerText = currentCart.reduce((sum, item) => sum + (item.qty || 0), 0);
    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const totalContainer = document.getElementById('cart-total');
    if (!container) return;

    const currentCart = getActiveCartItems();
    if (currentCart.length === 0) {
        container.innerHTML = `<div class="text-center py-12 px-4"><p class="text-sm text-gray-500">Tu carrito está vacío.</p></div>`;
        if (totalContainer) totalContainer.innerText = '$0.00';
        return;
    }

    let total = 0;
    let html = '<div class="space-y-3">';
    currentCart.forEach((item, index) => {
        let sub = (item.price || 0) * (item.qty || 1);
        total += sub;
        html += `
            <div class="bg-white border p-3 rounded-2xl flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${item.name}</h4>
                    <p class="text-xs text-orange-600 font-bold">$${(item.price || 0).toFixed(2)} x ${item.qty}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-sm">$${sub.toFixed(2)}</span>
                    <button onclick="removeFromCart(${index})" class="text-red-500 p-1"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    if (totalContainer) totalContainer.innerText = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('catalog_cart', JSON.stringify(cart));
    updateCartUI();
}