Qualtrics.SurveyEngine.addOnload(function() {
    /* small figures */
    var containers = document.querySelectorAll('tr[choiceid]');


    var question = document.querySelector('[questionid="QID42"]'); // select question

    const prev = document.getElementById('prev'); // previous button
    const next = document.getElementById('next'); // next button



    /* make number boxes read only */
    [...document.querySelectorAll('[id$="result"]')].forEach(result => result.setAttribute('readonly', true));

    /* Graphs */
    Highcharts.setOptions({
        plotOptions: { 
            series: { 
                color: '#000000', 
                animation: false, 
                states: { 
                    hover: { 
                        enabled: false 
                    } 
                }, 
                marker: { 
                    enabled: true, 
                    radius: 6, 
                    symbol: 'diamond' 
                } 
            } 
        },
        xAxis: {  // parte da modificare per inserire le risposte
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
                    fontSize: '8px' 
                }, 
                y: 10, 
                formatter: function(e) { 
                    if (this.value == 0) return 'Option A'; 
                    if (this.value == 1) return 'Option B'; 
                    if (this.value == 2) return 'Option C'; 
                    if (this.value == 3) return 'Option D' 
                } 
            }, 
            lineWidth: 1, 
            gridLineWidth: 0, 
            minorGridLineWidth: 0, 
            tickLength: 5, 
            tickWidth: 1 
        },
        yAxis: { // parte da modificare per inserire le opzioni di risposta
            min: 0.9,
            max: 3.1,
            tickInterval: 1,
            tickPositions: [1, 2, 3],
            plotLines: [{ width: 0, color: 'transparent' }],
            title: { enabled: false },
            labels: { 
                enabled: true, 
                style: { 
                    fontSize: '9px' 
                }, 
                x: -5, 
                formatter: function(e) { // da modificare
                    if (this.value == 3) return 'G'; 
                    if (this.value == 2) return 'dk'; 
                    if (this.value == 1) return 'B'; 
                } 
            },
            lineWidth: 1,
            gridLineWidth: 1,
            minorGridLineWidth: 0,
            gridLineColor: '#e5e5e5',
            tickLength: 0,
            tickWidth: 0,
            startOnTick: false,
            endOnTick: false
        }, // 'transparent' to hide lineColor
        legend: { enabled: false },
        credits: { enabled: false },
        title: false,
        tooltip: { enabled: false, snap: 0 }, // https://www.highcharts.com/forum/viewtopic.php?t=38620
        chart: { margin: [4, 25, 15, 25], plotBorderColor: '#ccc', plotBorderWidth: 1, },
    });

    containers.forEach(container => {
        container.querySelector('[id$="result"]').setAttribute('readonly', true) // make number boxes read only
        var c = Number(container.attributes.choiceid.value);                     // get object index, e.g. if id = container5 then c = 5
        var result = Qualtrics.SurveyEngine.getEmbeddedData('Result' + (c - 1)); // recover the data (for this specific survey, Result number is 1 less than choiceid)

        if (result) {                                                            // if data exists
            result = JSON.parse(result).map(x => { return x[1] })                // extract y data
            Highcharts.chart(                                                    // draw the small figure without axes
            container.querySelector('[id$="~text"]').id, 
            { series: [{ data: result, type: 'scatter' }] }
            ); 
        } else {                                                                 // if data does not exist 
            container.style.display = "none";                                    // hide  option
        }
    });

    // normalization
    // le risposte negli slider devono dare somma 100, questo codice qua sotto è un modo per "aggiustare" le risposte in modo che diano somma 100 (o vicino a 100)
    var sum = 0;
    var total = 100;
    var groups = [...document.querySelectorAll('[choiceid]')].filter(element => window.getComputedStyle(element).getPropertyValue('display') != "none"); // select only non-hidden elements

    function update_count() {
        sum = groups.map(group => parseInt(group.querySelector('[id$="result"]').value)).reduce((a, b) => a + b, 0);
        document.getElementById('count').innerHTML = 'People placed: ' + sum + '/' + total;
    }

    const norm = document.getElementById('norm'); // normalise button
    /* norm button functions */
    norm.addEventListener('click', () => {
        var maxLength = (parseInt(document.querySelector('[id$="track"]').style.width) - 1); // all bars have the same width, so any would do // -1 because bar and handle are one pixel shorter
        var barSum = groups.map(group => parseInt(group.querySelector('[id$="bar"]').style.width)).reduce((a, b) => a + b, 0);

        groups.forEach(group => {
            var holder     = group.querySelector('[id$="holder"]');
            var handle     = group.querySelector('[id$="handle"]');
            var bar        = group.querySelector('[id$="bar"]');
            var result     = group.querySelector('[id$="result"]');
            var trueresult = group.querySelector('[id$="true-result"]');

            var newLength = (barSum === 0 ? maxLength / groups.length : parseInt(handle.style.left) * maxLength / barSum);

            holder.classList.add("activated");
            handle.style.left = newLength + 'px';
            bar.style.width = newLength + 'px';
            result.value = Math.round(newLength / maxLength * 100);
            trueresult.value = Math.round(newLength / maxLength * 100);
        });

    }, false);

    // update count on click
    document.onclick = () => { update_count(); }

    validation_error = (element, message) => {
        var errmsg = element.querySelector('[id="error' + element.id + '"]'); // retrieve message DOM
        if (errmsg == null) {                                                 // if the question does not contain an error message yet
            errmsg = document.createElement("div");                           // create warning element
            errmsg.setAttribute("id", "error" + element.id);                  // sort it from other existing messages (e.g. runtime)
            errmsg.classList.add("ValidationError");                          // make it look like an error
            element.insertBefore(errmsg, element.firstChild);                 // place it on top of the question
            element.classList.add("Highlight");                               // highlight question
        }
        if (message == null) {                                                // if the message is empty remove the message
            errmsg.remove();
            element.classList.remove("Highlight");
        } else {
            errmsg.innerHTML = message;                                       // add the message
        }
    }

    /* button functions */
    prev.addEventListener('click', () => {
        validation_error(question, null)
        this.clickPreviousButton();
    }, false);

    next.addEventListener('click', () => {
        if (sum !== total) {
            validation_error(question, "You should place exactly 100 people")
            return;
        }
        validation_error(question, null)
        this.clickNextButton();
    }, false);
});