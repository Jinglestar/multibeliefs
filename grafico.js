Qualtrics.SurveyEngine.addOnload(function() { // funzione built-in del sito che essenzialmente runna il codice qua sotto al caricamento della pagina

    /* define constants */
    const page = this;                                       // 
    const question = document.querySelector('[id="QID38"]'); // identifica la domanda del questionario da riempire

    // VARIABILI DA MODIFICARE QUI
    const maxLoop     = 10;                                  // massimo numero di ripetizioni del grafico
    const actionCount =  4;                                  // numero di risposte (asse x) per ciascun grafico
    // idealmente actionCount andrebbe sostituito da una cosa del genere:
    // const actions = ['Option A','Option B','Option C','Option D'];// oppure leggi direttamente le azioni dalle opzioni del questionario: Qualtrics.SurveyEngine.getEmbeddedData('actions');
    // const actionCount =  actions.length;                   // numero di risposte (asse x) per ciascun grafico
    
    // stessa cosa per il numero di opzioni di risposta, che per ora è fisso a tre:
    // const ratings = ['Good','Don't know','Bad'];
    // const ratingCount = ratings.length;                    // numero di opzioni di risposta (asse y) per ciascuna

    // (se riusciamo) variabile per indicare se le actions sono collegate da una linea o sono separate
    // const continuous = false;

    /* buttons */
    const clear = document.getElementById('clear'); // clear button // bottone per cancellare l'attuale grafico
    const add   = document.getElementById('add');   // add   button // bottone per confermare l'attuale grafico
    const close = document.getElementById('close'); // close button // bottone per terminare il questionario
    const left  = document.getElementById('left');  // left  button // bottone per scorrere indietro tra i grafici disegnati
    const right = document.getElementById('right'); // right button // bottone per scorrere avanti tra i grafici disegnati

    /* define variables */
    var currentLoop = 1; // alternate loop
    var containers = document.querySelectorAll('[id^="container"]'); // identifica i riquadri piccoli dove vengono rappresentati tutti i grafici salvati // https://stackoverflow.com/a/24296220

    /* define functions */
    validation_error = (element,message) => {
        var errmsg = element.querySelector('[id="error'+element.id+'"]'); // retrieve message DOM
        if(errmsg == null) { //if the question does not contain an error message yet
            errmsg = document.createElement("div");           // create warning element
            errmsg.setAttribute("id", "error"+element.id);    // sort it from other existing messages (e.g. runtime)
            errmsg.classList.add("ValidationError");          // make it look like an error
            element.insertBefore(errmsg, element.firstChild); // place it on top of the question
            element.classList.add("Highlight");               // highlight question
        }
        if(message == null) { // if the message is empty remove the message
            errmsg.remove();
            element.classList.remove("Highlight");
        } else {
            errmsg.innerHTML = message; // add the message
        }
    }

    // questa funzione aggiorna gli elementi della pagina ogni volta che ci si sposta tra un grafico e un altro
    render_loop = (loop) => {

        currentLoop = loop;                // move to loop

        validation_error(question, null ); // remove previous error messages

        // Result1 è una variabile che tiene traccia della risposta nel primo grafico. 
        // La regola è che i partecipanti devono aver "disegnato" almeno un grafico per poter terminare questa parte del questionario
        // quindi, se questo dato non esiste, allora nasconde il bottone di chiusura
        close.style.visibility   = (Qualtrics.SurveyEngine.getEmbeddedData('Result1') ? "visible" : "hidden"); // hide close button if no data exist 

        if(currentLoop === 1) {left.classList.add("Disabled")} else {left.classList.remove("Disabled")}                    // disable left button if loop = 1
        if(currentLoop === last_loop_index()) {right.classList.add("Disabled")} else {right.classList.remove("Disabled")}  // disable right button if loop = last

        containers.forEach(container => {
            var c = Number(container.id.match(/\d+/)[0]);                    // get object index, e.g. if id = container5 then c = 5
            var result = Qualtrics.SurveyEngine.getEmbeddedData('Result'+c); // recover the data for that loop

            if (result) {                                                    // if data exists
                result = JSON.parse(result).map(x=>{return x[1]})            // extract y data

                // questa parte è così perché sull'html i riquadri piccoli sono divisi su due righe (5 sopra e 5 sotto) 
                // e volevamo essere sicuri che il primo elemento di ogni riga avesse le etichette sull'asse y
                if ([1,6].includes(c)) {                                     // if this is the first graph of the row
                    Highcharts.chart(container.id, {series:[{data: result}], yAxis:[{labels: yFirst}], chart:{margin: [4, 5, 15, 15]}} );  // draw the small figure including the axis labels // , type: 'scatter'
                } else {
                    Highcharts.chart(container.id, {series:[{data: result}]} );  // draw the small figure without axes  // , type: 'scatter'
                }
                container.removeAttribute("disabled");                       // enable the click to move to that loop //  If the specified attribute does not exist, removeAttribute() returns without generating an error. 
                container.style.cursor = 'pointer';                          // set cursor style to pointer

            } else {                                                         // if data does not exist 
                result = [];                                                 // set data as empty
                container.innerHTML = ''                                     // empty the DOM
                container.setAttribute('disabled', 'disabled');              // disable its click
                container.style.cursor = 'default';                          // set cursor style to arrow

            }
            
            /* render main graph */
            if (currentLoop==c) {
                add.value = (result.length > 0 ? ' edit view ' : ' add view '); // if the graph exists already, change button name
                drawing.series[0].update({data: result});                       // if this is the current loop, render the graph
            }    
        })
    }

    // queste funzioni riguardano come l'utente interagisce con il grafico principale, per adesso scritto in highcharts.js, e alcuni messaggi di errore

    add_point = (serie, x, y) => {
        x = Math.round(x); // (x / xstep) * xstep; to approximate, where xstep = (xmax - xmin) / (xbins - 1)
        y = Math.round(y); // can do the same with ystep
        serie.data.forEach((point) => { if (point.x === x) point.remove(); }); // remove previous point in the same x
        serie.addPoint([x, y], true, false, false);
    }

    extract_data = (chart) => {
        var yData = chart.series[0].yData; //get data from highchart
        var xData = chart.series[0].xData;
        var XYData = xData.map(function(x, i) { return [x, yData[i]] }); // merge X and Y arrays like [[x1,y1],[x2,y2],...]
        XYData = JSON.stringify(XYData); // convert to string for storage and comparison
        return XYData;
    }

    unfinished = () => {
        if (drawing.series[0].data.length > 0) { // if there is a drawing
            if (extract_data(drawing) !== Qualtrics.SurveyEngine.getEmbeddedData('Result'+currentLoop)) { // and it does not match stored data
                var dropdata = confirm("There is an unfinished drawing. Are you sure you do not want to finish? If yes, press OK.");
                if (dropdata == true) {} else {return true;} // continue drawing if people exit the window
            }
        }
        return false; // proceed
    }

    // questa funzione indica a quale loop spostarsi una volta aggiunto/modificato un grafico 
    last_loop_index = () => {
        for (var i = 1; i <= maxLoop; i++) {
            var result = Qualtrics.SurveyEngine.getEmbeddedData('Result'+i);    // get data
            if (result == null) break;                                          // exit when you find empty data
        }
        return Math.min(maxLoop,i); // i becomes maxLoop + 1 at the end of the for loop
    }

    /* button functions */
    add.addEventListener(  'click', () => {
        
        /* if not all 5 points were placed, ask the participant to complete the response. */
        if (drawing.series[0].data.length !== actionCount) { 
            validation_error(question, "Please add a rating for each action.")
            return; // exit if there are not enough points
        }

        XYData = extract_data(drawing);

        /* check for duplicates */
        var duplicate = false;                          // let us assume no more duplicates compared to previous check
        for (var i = 1; i <= maxLoop; i++) {            // check each drawing for duplicates
            if (currentLoop !== i) {                    // if this is not the current loop...
                if (XYData === Qualtrics.SurveyEngine.getEmbeddedData('Result'+i)) { // ...yet the drawing is the same
                    var duplicate = true;               // mark as duplicate
                    break;                              // break to keep the correct i when printing the warning message
                }
            }
        }

        if (duplicate) {
            validation_error(question, "This response is identical to response number " + i + "." );
            return; // exit if there are duplicates
        }

        Qualtrics.SurveyEngine.setEmbeddedData("Result" + currentLoop, XYData); // store data

        render_loop(last_loop_index()); // get to the first undrawn loop, or the last loop if all are drawn 
    }, false)

    clear.addEventListener('click', () => {

        for (var i = currentLoop; i <= maxLoop; i++) { // for all loops following the current one
            var result = (i==maxLoop ? null : Qualtrics.SurveyEngine.getEmbeddedData('Result'+(i+1)) ); // if it is the last loop, set as null, otherwise retrieve data from the following loop
            Qualtrics.SurveyEngine.setEmbeddedData('Result'+i, (result ? result : null) );              // overwrite current loop data
            if (result == null) break;                                                                  // exit when you find empty data
        } // i becomes maxLoop + 1 at the end of the for loop
        render_loop(last_loop_index());                                                                 // move to the first empty loop

    }, false)

    close.addEventListener('click', () => {

        if (unfinished()) return; // stop the event if participant wants to finish drawing

        //var sure = confirm("Once you proceed, you cannot edit the drawings. If you are sure, press OK.");
        //if (sure == true) 
        page.clickNextButton(); // move to next page
    }, false)

    left.addEventListener( 'click', () => {
        if(left.classList.contains('Disabled')) {} else {render_loop(currentLoop-1);}
    }, false)

    right.addEventListener('click', () => {
        if(right.classList.contains('Disabled')) {} else {render_loop(currentLoop+1);}
    }, false)

    containers.forEach(container => {
        container.addEventListener('click', event => {
            if(container.getAttribute('disabled') == 'disabled'){  // if small figure is set as disabled, click does nothing            
            } else {
                if (unfinished()) return;                          // stop the event if participant wants to finish drawing
                render_loop(Number(container.id.match(/\d+/)[0])); // set current loop to the number of the image
            }
        });
    });

    /* highchart options */
    Highcharts.setOptions({
        plotOptions: { 
            series: { 
                color: 'transparent', 
                animation: false, 
                states: { 
                    hover: { 
                        enabled: false 
                    } 
                }, 
                marker: { 
                    enabled: true, 
                    radius: 6, 
                    symbol: 'diamond', 
                    fillColor: '#000000' // questo è l'elemento da modificare con la const continuous (adesso è bianco, se vogliamo connettere i punti lo trasformerei in nero)
                } 
            } 
        },
        xAxis: { // <- questa è la parte da modificare per le risposte (per adesso sono 4, ma vorrei renderle flessibili)
            min: -0.05, 
            max: 3.05, 
            tickInterval: 1, 
            tickPositions: [0, 1, 2, 3], 
            categories: undefined, 
            title: { 
                enabled: false 
            }, 
            labels: { 
                enabled: true, 
                style: { 
                    fontSize: '9px' 
                }, 
                y: 10, 
                formatter: function(e) {
                    if (this.value == 0) return '6,0,0'; 
                    if (this.value == 1) return '2,2,2'; 
                    if (this.value == 2) return '4,3,3'; 
                    if (this.value == 3) return '5,5,1'
                } 
        }, 
        lineWidth: 0, 
        gridLineWidth: 0, 
        minorGridLineWidth: 0, 
        tickLength: 1, 
        tickWidth: 1 
    },
        yAxis: { // questa la parte invece da modificare per le opzioni di risposta
            min: 0.9, 
            max: 3.1, 
            tickInterval: 1, 
            tickPositions: [1, 2, 3], 
            plotLines: [{ 
                width: 0, color: 'transparent' 
            }], 
            title: { 
                enabled: false 
            }, 
            labels: { 
                enabled: false 
            }, 
            lineWidth: 0, 
            gridLineWidth: 1, 
            minorGridLineWidth: 0, 
            gridLineColor: '#e5e5e5', 
            tickLength: 0, 
            tickWidth: 0, 
            startOnTick: false, 
            endOnTick: false 
        }, 
        legend: { 
            enabled: false 
        }, 
        credits: { 
            enabled: false 
        }, 
        title: false, 
        tooltip: { 
            enabled: false, 
            snap: 0 
        }, // https://www.highcharts.com/forum/viewtopic.php?t=38620
        chart: { 
            margin: [4, 5, 15, 2], 
            plotBorderColor: '#ccc', 
            plotBorderWidth: 1, 
        },
    });

    // show axis labels for first small figure on the row
    var yFirst = { //                                    <- anche qua andrebbe modificato in base al numero di opzioni di risposta
        enabled: true, 
        style: { 
            fontSize: '9px' 
        }, 
        x: -5, 
        formatter: function(e) {
            if (this.value == 3) return 'G';//ood 
            if (this.value == 2) return 'dk';//don't know 
            if (this.value == 1) return 'B';//ad
        } 
    };

    var chartoptions = { // title: false, legend: { enabled: false }, credits: { enabled: false }, tooltip: { enabled: false, snap: 0 }, 
        xAxis: { //                                    <- anche qua andrebbe modificato in base al numero di risposte per grafico
            min: -0.1,
            max: 3.1,
            tickInterval: 1,
            lineWidth: 1,
            gridLineWidth: 0,
            lineColor: '#ccc',
            tickLength: 10,
            labels: { 
                enabled: true, 
                style: { 
                    fontSize: '14px' 
                }, 
            y: 35, 
            useHTML: true, 
            formatter: function() {
                if (this.value == 0) return 'Option A'; 
                if (this.value == 1) return 'Option B'; 
                if (this.value == 2) return 'Option C'; 
                if (this.value == 3) return 'Option D';
            } 
        },
        },
        yAxis: { // parte da modificare per inserire le opzioni di risposta
            min: 0.75,
            max: 3.25,
            tickInterval: 1,
            startOnTick: false,
            endOnTick: false,
            lineWidth: 1,
            gridLineWidth: 1,
            lineColor: '#ccc',
            tickLength: 10,
            tickWidth: 1,
            title: { enabled: false },
            labels: {
                enabled: true,
                style: { fontSize: '14px' },
                rotation: -45,
                x: -13,
                formatter: function() {
                    if (this.value == 3) return 'Good'
                    if (this.value == 2) return 'Don\'t know' 
                    if (this.value == 1) return 'Bad'
                }
            }
        },
        plotOptions: {
            series: { //opacity: 0.9, color: '#000000',
                animation: true,
                states: { 
                    hover: { 
                        enabled: true 
                    } 
                },
                marker: { 
                    enabled: true, 
                    radius: 10, 
                    symbol: 'diamond' 
                },
                stickyTracking: false,
                dragDrop: { 
                    draggableY: true, 
                    dragPrecisionY: 1 
                }
            }
        },
        chart: { // plotBorderColor: '#ccc', plotBorderWidth: 2,
            margin: [20, 30, 60, 80],
            events: { //render: function(e) { textBox.innerHTML = this.series[0].yData.join(); } for debugging purposes
                click: function(e) { 
                    add_point(this.series[0], e.xAxis[0].value, e.yAxis[0].value) 
                },
            }
        },
        series: [{ data: [] }] // scatter messes up the order of chart.series.xData, type: 'scatter'
    };

    var drawing = Highcharts.chart('draw', chartoptions);   // create the empty graph

    render_loop(currentLoop); // fill it if there are embedded data saved, and create small figures as well

});