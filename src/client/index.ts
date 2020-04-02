import 'common/tweaks.ts';
import { deepEquals, range, sanitize, random, throwExp } from 'common/utils.ts';
import $ from 'jquery';
import socketio from 'socket.io-client';

const _JASS_IS_DEBUG = false;

let previousTurnIndicator: number | undefined;
let previousTurnIndicatorDeltaWasNegative = false;

(window as unknown as {jQuery: any}).jQuery = $;

// Add touch start event listener for iOS; this allows :hover CSS selector to do its job
document.addEventListener("touchstart", () => {}, true);


// reload page if button is clicked
$('.reload-page').click((e) => {
    location.reload(true);
});

// read slider input and display value
$('#slider').on('input', () => {
    $('#slider-value').text($('#slider').val() as string);
});

// close score window on mouseclick
$('#score').click((e) => {
    $('#score').hide();
});

// show score window button
$('.toggle-scoreboard').click((e) => {
    $('#score').show();
});

// close all windows
$('.pop-up-window-container').hide();

// ...except the lobby one
$('#lobby-container').show();

const socket: SocketIOClient.Socket = socketio();
const lobbyId = location.search.match(/id=([a-zA-Z0-9\-_]*)/)?.[1];
const reconnectToken = localStorage.getItem('r7_reconnect_token');
if (!reconnectToken) {
    socket.emit('lobby.join', lobbyId);
} else {
    socket.emit('lobby.can-reconnect', reconnectToken, (canReconnect: boolean) => {
        if (canReconnect) {
            socket.emit('lobby.reconnect', reconnectToken);
        } else {
            socket.emit('lobby.join', lobbyId);
        }
    });
}
const handledQuestions: Set<string> = new Set();

// start game if the button is clicked
$('.lobby-startgame').click((e) => {
    socket.emit('lobby.request-start-game', lobbyId);
});

// add a handler for lobby updates
socket.on('lobby.waiting-players-update', (data: number) => {
    $('.lobby-playercount').text(data);
});

// add a handler for lobby errors
socket.on('lobby.error', (errtype: string, data: any) => {
    console.error(`Unhandled lobby error!`, errtype, data);
    alert(`Unhandled lobby error! More info in the console.\n\n${errtype}: ${JSON.stringify(data)}`);
});

// add a handler for game updates
socket.on('gameinfo', (data: any) => {
    localStorage.setItem('r7_reconnect_token', data.token);  

    $('#lobby-container').hide();

    const str = JSON.stringify(data, undefined, 4);

    const isSpectating = data.isSpectating;
    if (isSpectating) document.body.classList.add('spectating');
    else document.body.classList.remove('spectating');

    /**
     * Translates an id sent by the server (from 0-3, where the own player could be any of the four) into an id used
     * in the CSS (where 0 is bottom, 1 is left, 2 is top, 3 is right, and 0 is always the player itself)
     */
    function tplayer(pindex: number): number {
        if (isSpectating) return pindex;
        const pcount = data.gameState.playerHandSizes.length;
        return ((pindex - data.ownid) % pcount + pcount) % pcount;
    }

    /**
     * Rotates an array received by the server so that its indices use CSS player ids, no longer server player ids.
     */
    function rplayerarr<T>(arr: T[]): T[] {
        const res: T[] = [];
        for (let i = 0; i < data.gameState.playerHandSizes.length; i++) {
            res.push(arr[tplayer(i)]);
        }
        return res;
    }

    // Update turn indicator
    if (data.gameState.turnIndicator === undefined) {
        $('.turnindicator').css('background-color', 'transparent');
        previousTurnIndicator = undefined;
    } else {
        const colors = {
            yellow: 'rgb(255, 187, 0)',
            green: 'rgba(0, 255, 0, 1)',
        };

        const newTurnIndicator = tplayer(data.gameState.turnIndicator[0]);
        if (newTurnIndicator !== previousTurnIndicator) {
            if (previousTurnIndicator === undefined) previousTurnIndicator = newTurnIndicator;
            let dif = previousTurnIndicator - newTurnIndicator;
            dif = (dif % 4 + 6) % 4 - 2; // equivalent to: while (dif >= 2) dif -= 4; while (dif < -2) dif += 4;
            if (dif === 2) dif = (previousTurnIndicatorDeltaWasNegative ? -1 : 1) * 2;

            const oldTransform = `rotate(${45 - 90 * previousTurnIndicator}deg) scale(1)`;
            const newTransform = `rotate(${45 - 90 * newTurnIndicator}deg)`

            $('.turnindicator').css('transform', 'background-color ease 0.3s');
            $('.turnindicator').css('transform', oldTransform);
            forceReflow($('.turnindicator'));
            $('.turnindicator').css('transition', 'transform ease 0.5s, background-color ease 0.3s');
            $('.turnindicator').css('transform', newTransform);

            previousTurnIndicatorDeltaWasNegative = dif < 0;
        }

        $('.turnindicator').css('background-color', colors[data.gameState.turnIndicator[1] as 'yellow' | 'green']);

        previousTurnIndicator = (newTurnIndicator % 4 + 4) % 4;
    }
    

    if (data.gameState !== undefined) {

        // update scoreboard
        const scores = [...range(data.gameState.playerHandSizes.length)].map(a => 0);
        const guesses = [...range(data.gameState.playerHandSizes.length)].map(a => 0);
        for (const m of data.gameState.messages) {
            if (m[0] === "scoreplus") {
                scores[tplayer(m[1][1])] += m[1][0];
            }
            if (m[0] === "playerGuesses") {
                guesses[tplayer(0)] = m[1][0];
                guesses[tplayer(1)] = m[1][1];
                guesses[tplayer(2)] = m[1][2];
                guesses[tplayer(3)] = m[1][3];
            }
        }
        
        updateScore(scores, guesses, data.gameState.playerNames);

        // set trumpf icon (bottom right corner)
        for (const m of data.gameState.messages) {
            if (m[0] === "trumpf") {
                if (m[1] === "OBENABE") $('#trumpf').addClass("obe");
                if (m[1] === "UNNEUFFE") $('#trumpf').addClass("une");
                if (m[1] === "schieb") $('#trumpf').addClass("schieb");

                const color = m[1][1];
                const trumpf = $('#trumpf');
                const c = fromTypeToClassCard([color, 0])[0];
                trumpf.addClass(c);
            }
        }

        // Initialize cards on the jass mat
        // Maybe we should not replace cards that are already there, or is it better if animations are cancelled when the
        // next packet is received?
        if (data.gameState.stich !== undefined) {
            const jassmatHolder = $("#matcardwrap");
            let tagged = jassmatHolder.children('.card').toArray().map(a => $(a));
            for (const cardp of data.gameState.stich) {
                const card = createCard(cardp.card);
                const playerName = 'player' + tplayer(cardp.player);

                let existing = findTypeCard(cardp.card);
                if (existing.length <= 0 && (isSpectating || playerName !== 'player0')) {
                    existing = randomElement($('.' + playerName + '.hand .card'));
                }

                if (tagged.find(p => p.is(existing)) !== undefined) {
                    tagged = tagged.filter(p => !p.is(existing));
                    continue;
                }


                card.addClass(playerName);
                jassmatHolder.append(card);

                animateCard(existing, card);
            }

            for (const gestochen of tagged) {
                const classCard = getClassCard(gestochen);
                const type = fromClassCardToType(classCard);

                let stichContainer: JQuery | undefined;
                let hasFound = false;
                for (const message of data.gameState.messages) {
                    if (!hasFound && message[0] === 'playcard' && deepEquals(message[1], type)) {
                        hasFound = true;
                    }
                    if (hasFound && message[0] === 'stichwinner') {
                        stichContainer = $('.hand.player' + tplayer(message[1]) + ' > .stiche');
                        break;
                    }
                }

                if (stichContainer === undefined) {
                    gestochen.remove();
                    continue;
                }

                const newCard = createCard(type);
                stichContainer.append(newCard);
                animateCard(gestochen, newCard);
            }
        }
    }


    if (!isSpectating) {
        const ownCardHolder = $('.player0.hand .cardholder');

        // Populate the player's own hand
        const cardAngleDif = 172 / (data.hand.length + 1);
        const cardAngleStart = -86 + cardAngleDif;
        const ownCardArray = ownCardHolder.find('.card').toArray();
        let oldCardIter = -1;
        let lastCard;
        for (let i = 0; i < data.hand.length; i++) {
            let card: JQuery<HTMLElement> | undefined;
            for (let j = oldCardIter + 1; j < ownCardArray.length; j++) {
                if (fromTypeToClassCard(data.hand[i]).every(a => ownCardArray[j].classList.contains(a))) {
                    card = $(ownCardArray[j]) as JQuery<HTMLElement>;
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
    }

    // set namefield of other players
    for (let i = 0; i < data.gameState.playerNames.length; i++) {
        const cssplayer = tplayer(i);
        const cssplayerN = 'player' + cssplayer;
        if(!isSpectating && cssplayer === 0) continue;

        const namefield = $('.' + cssplayerN + '.hand .namefield');
        namefield.text(data.gameState.playerNames[i]);
    }

    // Populate the other player's hands
    for (let i = 0; i < data.gameState.playerHandSizes.length; i++) {
        const size = data.gameState.playerHandSizes[i];
        const cssplayer = tplayer(i);
        const cssplayerN = 'player' + cssplayer;
        if (!isSpectating && cssplayer === 0) continue;

        const cardholder = $('.' + cssplayerN + '.hand .cardholder');
        while (size < cardholder.find('.card').length) {
            cardholder.find('.card').last().remove();
        }
        while (cardholder.find('.card').length < size) {
            cardholder.append(createCard());
        }
        
        const cards = cardholder.find('.card');
        const cardAngleDifL = 172 / (size + 1);
        const cardAngleStartL = -86 + cardAngleDifL;
        for (let j = 0; j < size; j++) {
            $(cards[j]).css('transform', 'rotate(' + (cardAngleStartL + j * cardAngleDifL) + 'deg)');
        }
    }


    // Close the pop-up windows of questions asked in previous packets
    $('#diff').hide();
    $('#trumpf-container').hide();


    // Answer questions asked by the server
    const entries: [string, [string, any]][] = Object.entries(data.openQuestions);
    for (const openQuestion of entries) {
        const qid = openQuestion[0];
        const qtype = openQuestion[1][0];
        const qargs = openQuestion[1][1];

        if (handledQuestions.has(qid)) continue;

        switch (qtype) {
            case 'guessScore':
                $('#diff').show();
                $('#diff-button').off('click');
                $('#diff-button').click(() => {
                    const v = $('#slider').val() as string;
                    answerQuestion(qid, v);
                    $('#diff').hide();
                });
                break;
            case 'chooseCard':
                for (let i = 0; i < qargs.length; i++) {
                    addCardHandler(qargs[i], () => {
                        answerQuestion(qid, i);
                    });
                }
                break;
            case 'chooseTrumpf':
                $("#trumpf-container").show();
                $('#trumpf-window-buttons').empty();

                for (let i = 0; i < qargs.length; i++) {
                    makeTrumpfButton(qargs[i]).click(() => {
                        $("#trumpf-container").hide();
                        answerQuestion(qid, i);
                    });
                }
                break;
            case 'youWannaWyys':
                answerQuestion(qid, true);
                break;
            default:
                alert("Unknown question type: " + qtype + ". Please contact the developer\n\nSee the console for more info");
                // tslint:disable-next-line:no-console
                console.error("Unknown question type", openQuestion);
        }
    }


    // Display additional info if available
    if (_JASS_IS_DEBUG && data.additionalInfo) {
        alert("Received additional info by the server.\n\n" + JSON.stringify(data.additionalInfo, undefined, 4));
    }

});


function answerQuestion(qid: string, answer: any) {
    socket.emit('answer', [qid, answer]);
    handledQuestions.add(qid);
}

function makeTrumpfButton(name: any) {
    const serverStichOrderToCSS: [any, string][] = [
        ["OBENABE", "obe"],
        ["UNNEUFFE", "une"],
        [["COLOR", 0], "schelle"],
        [["COLOR", 1], "roesle"],
        [["COLOR", 2], "schilte"],
        [["COLOR", 3], "eichel"],
        ["schieb", "schieb"],
    ];

    const cssOrder = (serverStichOrderToCSS.find(a => deepEquals(a[0], name)) || ["", name])[1];

    const window = $("#trumpf-window-buttons");
    const res = $('<div class="trumpf-choose ' + cssOrder + '"></div>');
    window.append(res);
    return res;
}

const cardTypes = ['schelle', 'roesle', 'schilte', 'eichel'];
const cardNums = ['', '', '', '', '', '', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'under', 'ober', 'koenig', 'ass'];
/**
 * Translates a pair of numbers as received by the server into strings
 */
function fromTypeToClassCard(type: [number, number]): [string, string] {
    return [cardTypes[type[0]], cardNums[type[1]]];
}

function fromClassCardToType(clss: [string, string]): [number, number] {
    return [cardTypes.indexOf(clss[0]), cardNums.indexOf(clss[1])];
}

function getClassCard(obj: JQuery): [string, string] {
    const classList = [...obj[0].classList];
    const cl = (arr: string[]) => classList.find(a => a !== '' && arr.includes(a)) ?? throwExp(new Error('Object not a class card!'));
    return [cl(cardTypes), cl(cardNums)];
}

/**
 * Creates a new unselectable card element from the given type
 */
function createCard(type?: [number, number]): JQuery<HTMLElement> {
    const cardimg = $('<div></div>');
    cardimg.addClass('cardimg');

    const card = $('<div></div>');
    card.addClass('card');
    if (type !== undefined) {
        card.addClass('unselectable');
        const classCard = fromTypeToClassCard(type);
        card.addClass(classCard[0]);
        card.addClass(classCard[1]);
    }
    card.append(cardimg);

    return card;
}

function randomElement(obj: JQuery) {
    return obj.length === 0 ? obj : $(random(obj.toArray()));
}

function findTypeCard(type: [number, number]) {
    return randomElement($('.card.' + fromTypeToClassCard(type).join('.')));
}

function animateCard(existing: JQuery, newCard: JQuery) {
    // Set starting point of animation
    newCard.css('transition', '0s color');
    if (existing.length >= 1) {
        newCard.css('width', existing.css('width'));
        newCard.css('height', existing.css('height'));
        newCard.css('transform', existing.css('transform'));
        newCard.css('transform-origin', existing.css('transform-origin'));
        newCard.offset(existing.offset() as {top: number, left: number});
        existing.remove();
    }

    // Make sure our transition changes went through
    forceReflow(newCard);

    // Do the animation
    newCard.css('transition', '');
    newCard.css('width', '');
    newCard.css('height', '');
    newCard.css('left', '');
    newCard.css('top', '');
    newCard.css('transform', '');
    newCard.css('transform-origin', '');
}

function updateScore(sc: number[], gs: number[], playerNames: string[]) {
    const tbody = $('#score-window > .scoretable > tbody');
    tbody.empty();
    for (let i = 0; i < sc.length; i++) {
        tbody.append(sanitize`<tr><td>${playerNames[i]}</td><td>${gs[i]}</td><td>${sc[i]}</td></tr>`);
    }
}


/**
 * Adds the the given handler to the card object and makes it selectable
 */

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



// tslint:disable-next-line:variable-name
let _reflowForceDumpster = 0;
/**
 * Okay, so because of how browsers work, disabling transitions then changing a property doesn't cause the positions to
 * update immediately, which means that if you re-enable transitions right after might cause weird issues (such as the
 * property still transitioning to the target state, even if transitions were disabled in the moment we changed them).
 * 
 * Fortunately, there are tricks to force a reflow (such as accessing offset_ or scroll_ variables of an element).
 * Causing a reflow after changing the property but before re-enabling transitions works as a fix to our issues.
 */
function forceReflow(element: JQuery<HTMLElement>) {
    // At least one (probably all) of the following should work
    element.each((_, a) => { _reflowForceDumpster += a.offsetHeight; });
    element.each((_, a) => { _reflowForceDumpster += a.scrollTop; });
    _reflowForceDumpster += element.css('transform').length;
    _reflowForceDumpster %= 500000;

    for (let i = 0; "." + i !== ".100"; i++) {
        if (Math.random() < 0.99) return;
    }

    console.log("yeah you win the lottery gg " + _reflowForceDumpster);
}


