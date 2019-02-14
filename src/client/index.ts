import 'common/tweaks.ts';
import { deepEquals, range, sanitize } from 'common/utils.ts';
import $ from 'jquery';
import socketio from 'socket.io-client';

const _JASS_IS_DEBUG = false;



(window as unknown as {jQuery: any}).jQuery = $;

// Add touch start event listener for iOS; this allows :hover CSS selector to do its job
document.addEventListener("touchstart", () => {}, true);

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

const socket: SocketIOClient.Socket = socketio();
const handledQuestions: Set<string> = new Set();

socket.on('gameinfo', (data: any) => {
    const str = JSON.stringify(data, undefined, 4);
    // tslint:disable-next-line:no-console
    console.log(str);


    const ownCardHolder = $('.player0.hand .cardholder');

    /**
     * Translates an id sent by the server (from 0-3, where the own player could be any of the four) into an id used
     * in the CSS (where 0 is bottom, 1 is left, 2 is top, 3 is right, and 0 is always the player himself)
     */
    function tplayer(pindex: number): number {
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

                let existing = $('.card.' + fromTypeToClassCard(cardp.card).join('.'));
                if (existing.length <= 0 && playerName !== 'player0') {
                    existing = $('.' + playerName + '.hand .card');
                }
                if (existing.length >= 1) {
                    existing = $(existing[Math.floor(Math.random() * existing.length)]);
                    if (tagged.find(p => p.is(existing)) !== undefined) {
                        tagged = tagged.filter(p => !p.is(existing));
                        continue;
                    }
                }


                card.addClass(playerName);
                jassmatHolder.append(card);


                if (existing.length >= 1) {
                    animateFromTo(card, existing);
                }
            }

            tagged.forEach(p => {
                for (let i = 0; i < data.gameState.messages.length; i++) {
                    const message = data.gameState.messages[i];
                    if (message[0] === "playcard") {
                        if (fromTypeToClassCard(message[1]).every(a => p.hasClass(a))) {
                            const gestochen = createCard(message[1]);
                            console.warn(message, gestochen, false);
                            for (let j = i; j < data.gameState.messages.length; j++) {
                                const nmessage = data.gameState.messages[j];
                                if (nmessage[0] === "stichwinner") {
                                    const playerName = 'player' + tplayer(nmessage[1]);
                                    $('.' + playerName + ' .gestochenholder').append(gestochen);
                                    animateFromTo(gestochen, p, false);
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
                $(p).remove();
            });
        }
    }



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



    // Populate the other player's hands
    for (let i = 0; i < data.gameState.playerHandSizes.length; i++) {
        const size = data.gameState.playerHandSizes[i];
        const cssplayer = tplayer(i);
        const cssplayerN = 'player' + cssplayer;
        if (cssplayer === 0) continue;

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
    const entries: Array<[string, [string, any]]> = Object.entries(data.openQuestions);
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
                console.warn("Unknown question type", openQuestion);
        }
    }


    // Display additional info if available
    if (_JASS_IS_DEBUG && data.additionalInfo) {
        alert("Received additional info by the server.\n\n" + JSON.stringify(data.additionalInfo, undefined, 4));
    }

});


function animateFromTo(newEl: JQuery<HTMLElement>, from: JQuery<HTMLElement>, transform: boolean = true) {
    forceReflow(newEl);
    console.warn(from.css('transform'));
    console.warn(from.offset());
    console.warn(newEl.css('transform'));
    console.warn(newEl.offset());

    newEl.css('transition', '0s color');

    // Set starting point of animation
    newEl.css('width', from.css('width'));
    newEl.css('height', from.css('height'));
    if (transform) {
        newEl.css('transform', from.css('transform'));
        newEl.css('transform-origin', from.css('transform-origin'));
    }
    newEl.offset(from.offset() as {top: number, left: number});
    from.remove();

    // Make sure our transition changes went through
    forceReflow(newEl);

    console.warn(newEl.css('transform'));
    console.warn(newEl.offset());
    /*
    // Do the animation
    newEl.css('transition', '');
    newEl.css('width', '');
    newEl.css('height', '');
    newEl.css('left', '');
    newEl.css('top', '');
    if (transform) {
        newEl.css('transform', '');
        newEl.css('transform-origin', '');
    }*/
}


function answerQuestion(qid: string, answer: any) {
    socket.emit('answer', [qid, answer]);
    handledQuestions.add(qid);
}

function makeTrumpfButton(name: any) {
    const serverStichOrderToCSS: Array<[any, string]> = [
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

/**
 * Translates a pair of numbers as received by the server into strings
 */
function fromTypeToClassCard(type: [number, number]): [string, string] {
    const cardTypes = ['schelle', 'roesle', 'schilte', 'eichel'];
    const cardNums = ['', '', '', '', '', '', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'under', 'ober', 'koenig', 'ass'];

    return [cardTypes[type[0]], cardNums[type[1]]];
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
 * 
 * This was a weird one to debug, especially because in a good number of scenarios the reflow was triggered as a side
 * effect by other factors. But, I found a reliable way to detect whether the debug tools are open and it seems to work
 * cross-browser, which is nice in case I ever wanna put a Bitcoin miner somewhere. ;)
 */
function forceReflow(element: JQuery<HTMLElement>) {
    // At least one (probably all) of the following should work
    element.each((_, a) => { _reflowForceDumpster += a.offsetHeight; });
    element.each((_, a) => { _reflowForceDumpster += a.scrollTop; });
    _reflowForceDumpster += element.css('transform').length;
    _reflowForceDumpster %= 500000;

    // Make sure this method isn't getting optimized out (not that I expect compilers to be THAT advanced but who knows)
    for (let i = 0; "." + i !== ".100"; i++) {
        if (Math.random() < 0.99) return;
    }
    // tslint:disable-next-line:no-console
    console.log("yeah you win the lottery gg " + _reflowForceDumpster);
}


