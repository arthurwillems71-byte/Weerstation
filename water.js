// =========================
// SUPABASE
// =========================

const SUPABASE_URL = 'https://tyfrmkfmwoafaeauwyyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZnJta2Ztd29hZmFlYXV3eXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDQ5OTIsImV4cCI6MjEwMDk4MDk5Mn0.vvaLiUXS8_1z3G3GW_N5AluUH7VVQzAwCf7N_-Q-09g';

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let waterGrafiek = null;
let huidigeWaterPeriode = 'maand';

function veranderWaterPeriode(periode, knop) {
    huidigeWaterPeriode = periode;

    document
        .querySelectorAll('.periode-knoppen button')
        .forEach(button => {
            button.classList.remove('actief');
        });

    knop.classList.add('actief');

    waterDataLaden();
}   


// =========================
// METING OPSLAAN
// =========================

async function waterMetingOpslaan() {

    const invoer = document.getElementById('waterTemperatuur');

    const temperatuur = Number(invoer.value);

    if (isNaN(temperatuur)) {
        alert('Vul eerst een temperatuur in.');
        return;
    }

    const { error } = await supabaseClient
        .from('watermetingen')
        .insert([
            {
                temperatuur: temperatuur
            }
        ]);

    if (error) {
        console.error('Fout bij opslaan:', error);
        alert('De meting kon niet worden opgeslagen.');
        return;
    }

    invoer.value = '';

    await waterDataLaden();
}


// =========================
// DATA LADEN
// =========================

async function waterDataLaden() {

    const { data, error } = await supabaseClient
        .from('watermetingen')
        .select('temperatuur, created_at')
        .order('created_at', {
            ascending: true
        });

    if (error) {
        console.error('Fout bij laden:', error);
        return;
    }

    if (!data || data.length === 0) {
        document.getElementById(
            'huidigeWaterTemperatuur'
        ).textContent = '-- °C';
    
        waterGeschiedenisTonen([]);
        waterGrafiekMaken([]);
    
        return;
    }

    // =========================
    // DATUMBEREIK
    // =========================

    const nu = new Date();
    let startDatum = new Date(0);

    if (huidigeWaterPeriode === 'dag') {

        startDatum = new Date();
        startDatum.setHours(0, 0, 0, 0);

    } else if (huidigeWaterPeriode === 'week') {

        startDatum = new Date();
        startDatum.setDate(nu.getDate() - 7);

    } else if (huidigeWaterPeriode === 'maand') {

        startDatum = new Date();
        startDatum.setMonth(nu.getMonth() - 1);

    } else if (huidigeWaterPeriode === 'jaar') {

        startDatum = new Date();
        startDatum.setFullYear(nu.getFullYear() - 1);
        startDatum.setMonth(nu.getMonth(), 1);
        startDatum.setHours(0, 0, 0, 0);

    } else if (huidigeWaterPeriode === 'alles') {

        startDatum = new Date(0);
    }

    // =========================
    // FILTEREN
    // =========================

    const gefilterdeData = data.filter(
        meting =>
            new Date(meting.created_at) >= startDatum
    );

    if (gefilterdeData.length === 0) {
        document.getElementById(
            'huidigeWaterTemperatuur'
        ).textContent = '-- °C';

        waterGeschiedenisTonen([]);
        waterGrafiekMaken([]);

        return;
    }

    // =========================
    // LAATSTE METING
    // =========================

    const laatste = data[data.length - 1];

    document.getElementById(
        'huidigeWaterTemperatuur'
    ).textContent =
        `${Number(laatste.temperatuur).toFixed(1)} °C`;

    // =========================
    // GESCHIEDENIS EN GRAFIEK
    // =========================

    waterGeschiedenisTonen(gefilterdeData);

    waterGrafiekMaken(gefilterdeData);
}


// =========================
// GESCHIEDENIS
// =========================

function waterGeschiedenisTonen(data) {

    const tabel =
        document.getElementById('waterGeschiedenis');

    tabel.innerHTML = '';

    // Nieuwste eerst
    [...data].reverse().forEach(meting => {

        const datum = new Date(meting.created_at);

        const rij = document.createElement('tr');

        rij.innerHTML = `
            <td>
                ${datum.toLocaleDateString('nl-BE')}
            </td>

            <td>
                ${datum.toLocaleTimeString('nl-BE', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </td>

            <td>
                ${Number(meting.temperatuur).toFixed(1)} °C
            </td>
        `;

        tabel.appendChild(rij);
    });
}


// =========================
// GRAFIEK
// =========================

function waterGrafiekMaken(data) {

    if (!data || data.length === 0) {
        if (waterGrafiek) {
            waterGrafiek.destroy();
        }
    
        const ctx = document
            .getElementById('waterGrafiek')
            .getContext('2d');
    
        waterGrafiek = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Watertemperatuur',
                        data: [],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: huidigeWaterPeriode === 'dag'
                                ? 'Uur'
                                : huidigeWaterPeriode === 'jaar' ||
                                  huidigeWaterPeriode === 'alles'
                                    ? 'Maand'
                                    : 'Datum'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Temperatuur (°C)'
                        }
                    }
                }
            }
        });
    
        return;
    }

    // Oude grafiek verwijderen
    if (waterGrafiek) {
        waterGrafiek.destroy();
    }

    const ctx = document
        .getElementById('waterGrafiek')
        .getContext('2d');

    let datasets = [];
    let labels = [];

    // =========================
    // ALLES → JAARLIJNEN
    // =========================

    if (huidigeWaterPeriode === 'alles') {

        labels = [
            'Jan',
            'Feb',
            'Mrt',
            'Apr',
            'Mei',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Okt',
            'Nov',
            'Dec'
        ];

        const jaren = {};

        data.forEach(meting => {

            const datum = new Date(meting.created_at);

            const jaar = datum.getFullYear();
            const maand = datum.getMonth();

            if (!jaren[jaar]) {
                jaren[jaar] = Array.from(
                    { length: 12 },
                    () => []
                );
            }

            jaren[jaar][maand].push(
                Number(meting.temperatuur)
            );
        });

        Object.keys(jaren)
            .sort((a, b) => Number(a) - Number(b))
            .forEach(jaar => {

                const maandGemiddelden =
                    jaren[jaar].map(waarden => {

                        if (waarden.length === 0) {
                            return null;
                        }

                        const gemiddelde =
                            waarden.reduce(
                                (som, waarde) =>
                                    som + waarde,
                                0
                            ) / waarden.length;

                        return Number(
                            gemiddelde.toFixed(1)
                        );
                    });

                datasets.push({

                    label: jaar,

                    data: maandGemiddelden,

                    tension: 0.3,

                    fill: false,

                    pointRadius: 4,

                    pointHoverRadius: 7,

                    spanGaps: true
                });
            });

    } else {

        // =========================
        // NORMALE PERIODES
        // =========================

        if (huidigeWaterPeriode === 'jaar') {

            labels = data.map(meting => {

                const datum =
                    new Date(meting.created_at);

                return datum.toLocaleDateString(
                    'nl-BE',
                    {
                        month: 'short'
                    }
                );
            });

        } else {

            labels = data.map(meting => {

                const datum =
                    new Date(meting.created_at);

                if (
                    huidigeWaterPeriode === 'dag'
                ) {

                    return datum.toLocaleTimeString(
                        'nl-BE',
                        {
                            hour: '2-digit',
                            minute: '2-digit'
                        }
                    );

                }

                return datum.toLocaleDateString(
                    'nl-BE',
                    {
                        day: '2-digit',
                        month: '2-digit'
                    }
                );
            });
        }

        datasets = [
            {
                label: 'Watertemperatuur',

                data: data.map(
                    meting =>
                        Number(meting.temperatuur)
                ),

                tension: 0.3,

                fill: false,

                pointRadius: 4,

                pointHoverRadius: 7
            }
        ];
    }

    // =========================
    // GRAFIEK
    // =========================

    waterGrafiek = new Chart(ctx, {

        type: 'line',

        data: {
            labels: labels,
            datasets: datasets
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: 'index'
            },

            plugins: {

                tooltip: {

                    callbacks: {

                        label: function(context) {

                            if (
                                huidigeWaterPeriode ===
                                'alles'
                            ) {

                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C`;

                            }

                            return `Watertemperatuur: ${context.parsed.y.toFixed(1)} °C`;
                        }
                    }
                }
            },

            scales: {

                x: {

                    title: {

                        display: true,

                        text:
                            huidigeWaterPeriode === 'dag'
                                ? 'Uur'
                                : huidigeWaterPeriode === 'jaar' ||
                                  huidigeWaterPeriode === 'alles'
                                    ? 'Maand'
                                    : 'Datum'
                    }
                },

                y: {

                    title: {

                        display: true,

                        text: 'Temperatuur (°C)'
                    }
                }
            }
        }
    });
}
const waterDarkModeKnop =
    document.getElementById('waterDarkModeKnop');

function waterDonkereModusWisselen() {

    document.body.classList.toggle('dark-mode');

    const donker =
        document.body.classList.contains('dark-mode');

    localStorage.setItem(
        'donkereModus',
        donker ? 'aan' : 'uit'
    );

    waterDarkModeKnop.textContent =
        donker ? '☀️' : '🌙';
}

waterDarkModeKnop.addEventListener(
    'click',
    waterDonkereModusWisselen
);

// =========================
// START
// =========================

waterDataLaden();