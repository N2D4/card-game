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





    const ownCardHolder = $('.player0.hand .cardholder');




    if (data.gameState !== undefined) {
        if (data.gameState.stich !== undefined) {
            const jassmatHolder = $("#matcardwrap");
            jassmatHolder.empty();
            for (const cardp of data.gameState.stich) {
                const card = createCard(cardp.card);
                const playerName = 'player' + cardp.player;
                card.addClass(playerName);
                jassmatHolder.append(card);


                // Set starting point of animation
                card.css('transition', 'none');
                if (playerName === 'player0') {
                    const existing = $('.player0.hand .card.' + fromTypeToClassCard(cardp.card).join('.'));
                    if (existing.length >= 1) {
                        card.css('width', existing.css('width'));
                        card.css('height', existing.css('height'));
                        const oldOriginArr = existing.css('transform-origin').split(' ').map(a => parseFloat(a));
                        const newOrigin = { left: existing.width() as number / 2, top: existing.height() as number / 2 };
                        const originDif = [oldOriginArr[0] - newOrigin.left, oldOriginArr[1] - newOrigin.top];
                        card.css('transform', "translate(" + originDif[0] + "px, " + originDif[1] + "px) " + existing.css('transform') + " translate(-" + originDif[0] + "px, -" + originDif[1] + "px)");
                        card.css('transform-origin', '50% 50%');
                        card.offset(existing.offset() as {top: number, left: number});
                    }
                }

                // Do the animation
                card.css('transition', '');
                card.css('width', '');
                card.css('height', '');
                card.css('left', '');
                card.css('top', '');
                card.css('transform', '');
            }
        }
    }



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
            default:
                alert("Unknown question type: " + qtype + ". Please contact the developer");
                // tslint:disable-next-line:no-console
                console.log(openQuestion);
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


/**
 * Takes an argument in the form of the CSS matrix() transform (2D)
 */
function changeMatrixOrigin(matrix: number[], oldOrigin: {left: number, top: number}, newOrigin: {left: number, top: number}): number[] {
    const x0 = oldOrigin.left - newOrigin.left;
    const y0 = oldOrigin.top - newOrigin.top;
    const m = matrix;
    return [m[0], m[1], m[2], m[3], x0 - m[0] * x0 - m[2] * y0, y0 - m[1] * x0 - m[3] * y0];
}



