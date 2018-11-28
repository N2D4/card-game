import 'common/tweaks.ts';
import socketio from 'socket.io-client';



const socket: SocketIOClient.Socket = socketio();

socket.on('gameinfo', (data: any) => {
    const str = JSON.stringify(data, undefined, 4);
    (document.getElementById("outarea") as HTMLElement).innerText = str;
});

const submitter: HTMLElement = document.getElementById('submit') as HTMLElement;
submitter.addEventListener('click', event => {
    const qid = (document.getElementById('qid') as HTMLInputElement).value;
    const resp = Number((document.getElementById('resp') as HTMLInputElement).value);
    socket.emit('answer', [qid, resp]);
});
