
const emitStatus = (payload, io, socket) => {
    if (!payload || !payload.socketId) return;
    
    try {
        // If this process hosts the Socket.IO server, emit directly
        if (io) {
            io.to(payload.socketId).emit('fileUploadStatus', {
                file: payload.file,
                status: payload.status,
                progress: payload.progress
            });
            return;
        }

        // Otherwise, use the socket client to send events to the Web API server
        if (socket && typeof socket.emit === 'function') {
            socket.emit('game:patchstatus', {
                socketId: payload.socketId,
                file: payload.file,
                status: payload.status,
                progress: payload.progress
            });
        }
    } catch (err) {
        console.warn('emitStatus error', err && err.message ? err.message : err);
    }
};

module.exports = {
    emitStatus
};