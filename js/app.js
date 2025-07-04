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
            
            // Verificar conexión a Supabase antes de cargar mensajes
            checkSupabaseConnection().then(() => {
                // Cargar historial de chat
                loadMessages();
                
                // Solicitar permiso de notificación
                requestNotificationPermission();
            
                // Iniciar sondeo de mensajes simulados
                startMessagePolling();
            }).catch(error => {
                console.error('Error de conexión a Supabase:', error);
                const errorMessage = document.createElement('div');
                errorMessage.classList.add('bg-red-100', 'text-red-700', 'p-3', 'rounded-lg', 'text-center', 'mb-4');
                errorMessage.textContent = 'Error de conexión. Verifica tu configuración de Supabase.';
                messageList.appendChild(errorMessage);
            });
        }, 300);
    }

    async function loadMessages() {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error al cargar mensajes:', error);
                // Mostrar mensaje de error al usuario
                const errorMessage = document.createElement('div');
                errorMessage.classList.add('bg-red-100', 'text-red-700', 'p-3', 'rounded-lg', 'text-center', 'mb-4');
                errorMessage.textContent = 'Error al cargar mensajes. Verifica tu conexión.';
                messageList.appendChild(errorMessage);
                return;
            }

            messageList.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(msg => {
                    const type = msg.sender === username ? 'user' : 'ai';
                    addMessage(msg.sender, msg.text, type, msg.created_at);
                });
            } else {
                // Mostrar mensaje cuando no hay mensajes
                const noMessages = document.createElement('div');
                noMessages.classList.add('text-gray-500', 'text-center', 'py-8');
                noMessages.textContent = 'No hay mensajes aún. ¡Sé el primero en escribir!';
                messageList.appendChild(noMessages);
            }
        } catch (err) {
            console.error('Error inesperado al cargar mensajes:', err);
        }
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
        
            // Desconectarse del canal de Supabase
            if (window.chatChannel) {
                window.chatChannel.unsubscribe();
                window.chatChannel = null;
                console.log('Desconectado del chat en tiempo real');
            }
            
            // Limpiar intervalo de reconexión
            if (window.reconnectionInterval) {
                clearInterval(window.reconnectionInterval);
                window.reconnectionInterval = null;
            }
            
            // Ocultar indicador de estado de conexión
            const statusElement = document.getElementById('connection-status');
            if (statusElement) {
                statusElement.remove();
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


    function addMessage(sender, text, type = 'ai', timestamp = null) {
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

        // Usar la marca de tiempo proporcionada o crear una nueva
        const messageTime = timestamp ? new Date(timestamp) : new Date();
        const formatted = formatTimestamp(messageTime);
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
        try {
            const { error, data } = await supabase
                .from('messages')
                .insert([{ 
                    sender: username, 
                    text: message,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('Error al guardar mensaje en Supabase:', error);
                
                // Mostrar error más amigable
                const errorMessage = document.createElement('div');
                errorMessage.classList.add('bg-red-100', 'text-red-700', 'p-3', 'rounded-lg', 'text-center', 'mb-4', 'fade-in');
                errorMessage.textContent = 'Error al enviar mensaje. Verifica tu conexión.';
                messageList.appendChild(errorMessage);
                
                // Remover el mensaje de error después de 5 segundos
                setTimeout(() => {
                    if (errorMessage.parentNode) {
                        errorMessage.remove();
                    }
                }, 5000);
                
                throw error;
            } else {
                console.log('Mensaje guardado en Supabase:', data);
            }
        } catch (err) {
            console.error('Error inesperado al enviar mensaje:', err);
            throw err;
        }
    }


    function startMessagePolling() {
        // Crear un canal único para este usuario
        const channel = supabase
            .channel(`chat-room-${Date.now()}`)
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'messages' }, 
                payload => {
                    const msg = payload.new;
                    console.log('Nuevo mensaje recibido:', msg);
                    
                    // Determinar el tipo de mensaje basado en el remitente
                    const messageType = msg.sender === username ? 'user' : 'ai';
                    
                    // Solo agregar el mensaje si no es nuestro propio mensaje recién enviado
                    // o si es un mensaje de otro usuario
                    if (msg.sender !== username || !isRecentMessage(msg)) {
                        addMessage(msg.sender, msg.text, messageType, msg.created_at);
                        
                        // Mostrar notificación si es un mensaje de otro usuario
                        if (msg.sender !== username) {
                            notifyNewMessage(msg.sender, msg.text);
                        }
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                console.log('Presencia sincronizada');
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Usuario conectado:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Usuario desconectado:', leftPresences);
            });

        // Suscribirse al canal
        channel.subscribe((status) => {
            console.log('Estado de suscripción:', status);
            if (status === 'SUBSCRIBED') {
                console.log('Conectado al chat en tiempo real');
                showConnectionStatus('connected');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                console.log('Desconectado del chat en tiempo real');
                showConnectionStatus('disconnected');
            } else {
                showConnectionStatus('connecting');
            }
        });

        // Guardar referencia del canal para poder desconectarse después
        window.chatChannel = channel;
        
        // Configurar reconexión automática
        setupReconnection();
    }

    // Función para verificar si un mensaje es muy reciente (para evitar duplicados)
    function isRecentMessage(msg) {
        const now = new Date();
        const msgTime = new Date(msg.created_at);
        const diffInSeconds = (now - msgTime) / 1000;
        
        // Si el mensaje tiene menos de 2 segundos, considerarlo reciente
        return diffInSeconds < 2;
    }

    // Función para reconectar automáticamente si se pierde la conexión
    function setupReconnection() {
        // Evitar múltiples intervalos
        if (window.reconnectionInterval) {
            clearInterval(window.reconnectionInterval);
        }
        
        // Verificar conexión cada 30 segundos
        window.reconnectionInterval = setInterval(() => {
            if (window.chatChannel && window.chatChannel.subscribeStatus !== 'SUBSCRIBED') {
                console.log('Reconectando al chat...');
                startMessagePolling();
            }
        }, 30000);
    }

    // Función para verificar la conexión a Supabase
    async function checkSupabaseConnection() {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('count')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            console.log('Conexión a Supabase verificada correctamente');
            return true;
        } catch (error) {
            console.error('Error al verificar conexión a Supabase:', error);
            throw error;
        }
    }

    // Función para mostrar el estado de conexión
    function showConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'connection-status';
            statusDiv.classList.add('fixed', 'top-2', 'right-2', 'px-3', 'py-1', 'rounded-full', 'text-xs', 'text-white', 'z-50');
            document.body.appendChild(statusDiv);
        }
        
        const element = document.getElementById('connection-status');
        if (status === 'connected') {
            element.textContent = '🟢 Conectado';
            element.classList.remove('bg-red-500');
            element.classList.add('bg-green-500');
        } else if (status === 'disconnected') {
            element.textContent = '🔴 Desconectado';
            element.classList.remove('bg-green-500');
            element.classList.add('bg-red-500');
        } else {
            element.textContent = '🟡 Conectando...';
            element.classList.remove('bg-green-500', 'bg-red-500');
            element.classList.add('bg-yellow-500');
        }
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