import 'common/tweaks.ts';
import $ from 'jquery';
import socketio from 'socket.io-client';

(window as unknown as {jQuery: any}).jQuery = $;

// Add touch start event listener for iOS; this allows :hover CSS selector to do its job
document.addEventListener("touchstart", () => {}, true);

const socket: SocketIOClient.Socket = socketio();

socket.on('gameinfo', (data: any) => {
    const str = JSON.stringify(data, undefined, 4);
    $("#outarea").text(str);
    console.log(str);





    const ownCardHolder = $('.own.hand .cardholder');

    const cardAngleDif = 172 / (data.hand.length + 1);
    const cardAngleStart = -86 + cardAngleDif;
    const ownCardArray = ownCardHolder.find('.card').toArray();
    let oldCardIter = -1;
    let lastCard;
    for (let i = 0; i < data.hand.length; i++) {
        let card: JQuery<HTMLElement> | undefined;
        for (let j = oldCardIter + 1; j < ownCardArray.length; j++) {
            if (fromTypeToClassCard(data.hand[i]).every(a => ownCardArray[j].classList.contains(a))) {
                card = $(ownCardArray[j]);
                card.addClass('unselectable');
                card.off('click');
                for (let k = oldCardIter + 1; k < j; k++) {
                    (ownCardArray[k].parentNode as Node).removeChild(ownCardArray[k]);
                }
                oldCardIter = j;
                break;
            }
        }

        if (card === undefined) {
            card = createCard(data.hand[i]);
            if (lastCard === undefined) card.prependTo(ownCardHolder);
            else card.insertAfter(lastCard);
        }

        const ang = cardAngleStart + i * cardAngleDif;
        card.css('transform', 'rotate(' + ang + 'deg)');

        lastCard = card;
    }
    for (let k = oldCardIter + 1; k < ownCardArray.length; k++) {
        (ownCardArray[k].parentNode as Node).removeChild(ownCardArray[k]);
    }





    if (data.gameState !== undefined) {
        if (data.gameState.stich !== undefined) {
            const jassmatHolder = $("#matcardwrap");
            jassmatHolder.empty();
            for (const cardp of data.gameState.stich) {
                const card = createCard(cardp.card);
                card.addClass('player' + cardp.player);
                jassmatHolder.append(card);
            }
        }
    }





    const entries: Array<[string, [string, any]]> = Object.entries(data.openQuestions);
    for (const openQuestion of entries) {
        const qid = openQuestion[0];
        const qtype = openQuestion[1][0];
        const qargs = openQuestion[1][1];

        switch (qtype) {
            case 'guessScore':
                socket.emit('answer', [qid, qargs[0]]);
                break;
            case 'chooseCard':
                for (let i = 0; i < qargs.length; i++) {
                    addCardHandler(qargs[i], () => {
                        socket.emit('answer', [qid, i]);
                    });
                }
                break;
        }
    }
});

$('#submit').click(event => {
    const qid = (document.getElementById('qid') as HTMLInputElement).value;
    const resp = Number((document.getElementById('resp') as HTMLInputElement).value);
    socket.emit('answer', [qid, resp]);
});


function fromTypeToClassCard(type: [number, number]): [string, string] {
    const cardTypes = ['schelle', 'roesle', 'schilte', 'eichel'];
    const cardNums = ['', '', '', '', '', '', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'under', 'ober', 'koenig', 'ass'];

    return [cardTypes[type[0]], cardNums[type[1]]];
}

function createCard(type: [number, number]): JQuery<HTMLElement> {
    const cardimg = $('<div></div>');
    cardimg.addClass('cardimg');

    const card = $('<div></div>');
    card.addClass('unselectable');
    card.addClass('card');
    const classCard = fromTypeToClassCard(type);
    card.addClass(classCard[0]);
    card.addClass(classCard[1]);
    card.append(cardimg);

    return card;
}

function addCardHandler(card: (JQuery<HTMLElement> | [number, number]), handler: (() => void)) {
    if (Array.isArray(card)) {
        card = $('.unselectable.card.' + fromTypeToClassCard(card).join('.'));
    }
    card.click(handler);
    card.removeClass('unselectable');
}



