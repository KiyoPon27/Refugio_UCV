// Elementos DOM
const landingScreen = document.getElementById('landing-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username');
const nameError = document.getElementById('name-error');
const startChatBtn = document.getElementById('start-chat-btn');
const backBtn = document.getElementById('back-btn');
const messageList = document.getElementById('message-list');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
    
// Estado
let username = '';

// Evento Listeners
startChatBtn.addEventListener('click', startChat);
backBtn.addEventListener('click', goBack);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
    
// Funciones
    function startChat() {
        username = usernameInput.value.trim();
        
        if (!username) {
            nameError.classList.remove('hidden');
            return;
        }
        
        nameError.classList.add('hidden');
        landingScreen.classList.add('slide-out');
        
        setTimeout(() => {
            landingScreen.classList.add('hidden');
            chatScreen.classList.remove('hidden');
            chatScreen.classList.add('slide-in');
            
            // Mostrar un banner de bienvenida
            const welcomeBanner = document.createElement('div');
            welcomeBanner.classList.add('bg-blue-100', 'text-blue-700', 'p-3', 'rounded-lg', 'text-center', 'mb-4', 'fade-in');
            welcomeBanner.textContent = '¡Bienvenido al chat!';
            messageList.appendChild(welcomeBanner);
            
            // Cargar historial de chat
            loadMessages();
            
            // Solicitar permiso de notificación
            requestNotificationPermission();
        
            // Iniciar sondeo de mensajes simulados
            startMessagePolling();
        }, 300);
    }

    async function loadMessages() {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });// <--- true para orden ascendente

        if (error) {
            console.error('Error al cargar mensajes:', error);
            return;
        }

        messageList.innerHTML = '';
        data.forEach(msg => {
            const type = msg.sender === username ? 'user' : 'ai';
            addMessage(msg.sender, msg.text, type);
        });
    }

    function goBack() {
        chatScreen.classList.add('slide-out');
        
        setTimeout(() => {
            chatScreen.classList.add('hidden');
            chatScreen.classList.remove('slide-in', 'slide-out');
            landingScreen.classList.remove('hidden', 'slide-out');
            landingScreen.classList.add('slide-in');
        
            // Borrar historial de chat
            messageList.innerHTML = '';
            usernameInput.value = username;
            usernameInput.focus();
        
            // Borrar cualquier intervalo de sondeo
            if (window.pollingInterval) {
            clearInterval(window.pollingInterval);
            }
        }, 300);
    }
    
    async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    messageInput.disabled = true;
    sendBtn.disabled = true;

    addMessage(username, message, 'user');
    messageInput.value = '';

    try {
        await simulateSendMessageToBackend(message);
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
    } finally {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}


    function formatTimestamp(date) {
        const now = new Date();
        const diff = now - date;
        const oneDay = 24 * 60 * 60 * 1000;

        const options = { hour: '2-digit', minute: '2-digit' };

        if (diff < oneDay && date.getDate() === now.getDate()) {
            return 'hoy a las ' + date.toLocaleTimeString('es-PE', options);
        } else if (
            diff < 2 * oneDay &&
            date.getDate() === now.getDate() - 1
        ) {
            return 'ayer a las ' + date.toLocaleTimeString('es-PE', options);
        } else {
            return date.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }) + ', ' + date.toLocaleTimeString('es-PE', options);
        }
    }


    function addMessage(sender, text, type = 'ai') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('flex', 'flex-col', 'mb-4', 'fade-in');
        
        const messageAlign = type === 'user' ? 'items-end' : 'items-start';
        messageElement.classList.add(messageAlign);
        
        const senderElement = document.createElement('div');
        senderElement.classList.add('text-xs', 'text-gray-500', 'mb-1', 'px-2');
        senderElement.textContent = sender;
        
        const bubbleElement = document.createElement('div');
        bubbleElement.classList.add('px-4', 'py-3', 'max-w-xs', 'break-words');
        
        if (type === 'user') {
            bubbleElement.classList.add('user-message');
        }
        else {
            bubbleElement.classList.add('ai-message');
        }
        
        bubbleElement.textContent = text;
        
        // Agregar marca de tiempo
        const timeElement = document.createElement('div');
        timeElement.classList.add('message-timestamp');

        const now = new Date();
        const formatted = formatTimestamp(now);
        timeElement.textContent = formatted;

        // Agregar confirmaciones de lectura para los mensajes de los usuarios
        if (type === 'user') {
            const statusElement = document.createElement('span');
            statusElement.classList.add('message-status', 'read');
            statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
            timeElement.appendChild(statusElement);
        }
        
        bubbleElement.appendChild(timeElement);
        
        messageElement.appendChild(senderElement);
        messageElement.appendChild(bubbleElement);
        
        messageList.appendChild(messageElement);
        
        // Desplazarse hacia abajo
        scrollToBottom();
    }
    
    function showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.id = 'typing-indicator';
        typingElement.classList.add('flex', 'items-start', 'mb-4');
        
        const senderElement = document.createElement('div');
        senderElement.classList.add('text-xs', 'text-gray-500', 'mb-1', 'px-2');
        senderElement.textContent = 'Alguien';
        
        const indicatorContent = document.createElement('div');
        indicatorContent.classList.add('ai-message', 'typing-indicator');
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.classList.add('mx-0.5');
            indicatorContent.appendChild(dot);
        }
        
        typingElement.appendChild(senderElement);
        typingElement.appendChild(indicatorContent);
        messageList.appendChild(typingElement);
        
        scrollToBottom();
    }
    
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    function scrollToBottom() {
        messageList.scrollTop = messageList.scrollHeight;
    }
    
// Solicitar permiso de notificación
    function requestNotificationPermission() {
        if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
// Simular el envío de un mensaje al backend
    async function simulateSendMessageToBackend(message) {
    const { error, data } = await supabase
        .from('messages')
        .insert([{ sender: username, text: message }]);

    if (error) {
        console.error('Error al guardar mensaje en Supabase:', error.message);
        alert('No se pudo enviar el mensaje: ' + error.message);
        throw error;
    } else {
        console.log('Mensaje guardado en Supabase:', data);
    }
}


    function startMessagePolling() {
        supabase
            .channel('chat-room')
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'messages' }, 
                payload => {
                const msg = payload.new;
                if (msg.sender !== username) {
                    addMessage(msg.sender, msg.text, 'ai');
                }
            })
        .subscribe();
    }

    
// Manejar mensaje recibido
    function receiveMessage(sender, text) {
        addMessage(sender, text, 'ai');
        
        // Comprueba si la ventana no está enfocada para mostrar la notificación
        if (!document.hasFocus()) {
            notifyNewMessage(sender, text);
        }
    }
    
// Mostrár notificación de mensaje nuevo
    function notifyNewMessage(sender, text) {
        // Mostrar notificación del navegador si se concede el permiso
        if (Notification && Notification.permission === 'granted') {
            const notification = new Notification('Nuevo mensaje de ' + sender, {
                body: text,
                icon: 'https://via.placeholder.com/48'
            });
        
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        } 
        else {
            // Fallback - mostrar notificación en la aplicación
            const notificationBanner = document.createElement('div');
            notificationBanner.classList.add('fixed', 'top-4', 'right-4', 'bg-blue-600', 'text-white', 'p-3', 'rounded-lg', 'shadow-lg', 'z-50', 'fade-in');
            notificationBanner.innerHTML = `<strong>${sender}:</strong> ${text}`;
            document.body.appendChild(notificationBanner);
            
            setTimeout(() => {
            notificationBanner.classList.add('fade-out');
            setTimeout(() => notificationBanner.remove(), 300);
            }, 3000);
        }
    }