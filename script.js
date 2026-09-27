
const SUPABASE_URL = 'https://tyfrmkfmwoafaeauwyyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZnJta2Ztd29hZmFlYXV3eXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDQ5OTIsImV4cCI6MjEwMDk4MDk5Mn0.vvaLiUXS8_1z3G3GW_N5AluUH7VVQzAwCf7N_-Q-09g';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function updateDashboard(meting) {
  const temperatuur = Number(meting.temperatuur);
  const druk = Number(meting.druk).toFixed(2).replace('.', ',');
  const huidigeDruk = Number(meting.druk);
  const vocht = Number(meting.luchtvochtigheid).toFixed(2).replace('.', ',');
  const batterij = Math.round(Number(meting.batterij));
  // Huidige temperatuur
  document.getElementById('temp').innerHTML =
    `${temperatuur} <span class="unit">°C</span>`;
  // Huidige luchtdruk
  document.getElementById('druk').innerHTML =
    `${druk} <span class="unit">hPa</span>`;
  // Huidige luchtvochtigheid
  document.getElementById('vocht').innerHTML =
    `${vocht} <span class="unit">%</span>`;
  // Batterij
  document.getElementById('batterij').textContent =
    batterij + '%';
  // Batterijmelding
  const melding = document.getElementById('batterijMelding');
  if (batterij < 30) {
    melding.textContent =
      `⚠️ Batterij bijna leeg: ${batterij}%`;
    melding.classList.add('visible');
  } else {
    melding.classList.remove('visible');
  }

  // Tijdstip
  const opties = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };

  const datum = new Date(meting.created_at);

  document.getElementById('tijdstip').textContent =
    `Laatste meting: ${datum.toLocaleDateString('nl-BE', opties)}`;

// Temperatuurtrend
if (vorigeTemperatuur !== null) {
  const verschilTemp = temperatuur - vorigeTemperatuur;
  const tempTrend = document.getElementById('tempTrend');

  if (verschilTemp > 0) {
    tempTrend.textContent =
      `↗ +${verschilTemp.toFixed(2).replace('.', ',')} °C`;
  } else if (verschilTemp < 0) {
    tempTrend.textContent =
      `↘ ${verschilTemp.toFixed(2).replace('.', ',')} °C`;
  } else {
    tempTrend.textContent = `↔ 0,00 °C`;
  }
}
// Luchtvochtigheidstrend
const huidigeVochtigheid = Number(meting.luchtvochtigheid);
if (vorigeVochtigheid !== null) {
  const verschilVocht = huidigeVochtigheid - vorigeVochtigheid;
  const vochtTrend = document.getElementById('vochtTrend');

  if (verschilVocht > 0) {
    vochtTrend.textContent =
      `↗ +${verschilVocht.toFixed(2).replace('.', ',')} %`;
  } else if (verschilVocht < 0) {
    vochtTrend.textContent =
      `↘ ${verschilVocht.toFixed(2).replace('.', ',')} %`;
  } else {
    vochtTrend.textContent = `↔ 0,00 %`;
  }
}
if (typeof vorigeDruk !== 'undefined' && vorigeDruk !== null) {
  const verschilDruk = huidigeDruk - vorigeDruk;
  const drukTrend = document.getElementById('drukTrend');

  if (drukTrend) {
    if (verschilDruk > 0) {
      drukTrend.textContent =
        `↗ +${verschilDruk.toFixed(2).replace('.', ',')} hPa`;
    } else if (verschilDruk < 0) {
      drukTrend.textContent =
        `↘ ${verschilDruk.toFixed(2).replace('.', ',')} hPa`;
    } else {
      drukTrend.textContent = `↔ 0,00 hPa`;
    }
  }
}
vorigeDruk = huidigeDruk;
vorigeTemperatuur = temperatuur;
vorigeVochtigheid = huidigeVochtigheid;
}

async function haalMeestRecenteMetingOp() {
  try {
    const { data, error } = await supabaseClient
      .from('sensor_metingen')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      updateDashboard(data[0]); 
    } else {
      document.getElementById('tijdstip').textContent = "Er zijn nog geen metingen aanwezig in de database.";
    }
  } catch (err) {
    document.getElementById('error-bericht').textContent = `Verbindingsfout: ${err.message || err}`;
    document.getElementById('tijdstip').textContent = "Laden mislukt.";
    console.error('Databasefout:', err);
  }
}
function startRealtimeLuisteraar() {
try {
  supabaseClient
    .channel('schema-db-changes') // Generieke kanaalnaam
    .on(
      'postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sensor_metingen' 
      }, 
      payload => {
        console.log('Nieuwe live meting ontvangen:', payload.new);

        updateDashboard(payload.new);
        haalGeschiedenisOp();
        haalTemperatuurGrafiekOp();
      }
    )
    .subscribe((status) => {
      console.log("Supabase Realtime status:", status);
    });
} catch (err) {
  console.error('Realtimefout:', err);
}
}

function formatteerDatum(datum) {
const nu = new Date();

const vandaag = new Date(
  nu.getFullYear(),
  nu.getMonth(),
  nu.getDate()
);

const datumDag = new Date(
  datum.getFullYear(),
  datum.getMonth(),
  datum.getDate()
);

const verschilDagen =
  Math.round((vandaag - datumDag) / (1000 * 60 * 60 * 24));

const tijd = datum.toLocaleTimeString('nl-BE', {
  hour: '2-digit',
  minute: '2-digit'
});

if (verschilDagen === 0) {
  return `Vandaag, ${tijd}`;
}

if (verschilDagen === 1) {
  return `Gisteren, ${tijd}`;
}

return datum.toLocaleDateString('nl-BE', {
  day: 'numeric',
  month: 'long'
}) + `, ${tijd}`;
}

async function haalGeschiedenisOp() {
try {
  const { data, error } = await supabaseClient
    .from('sensor_metingen')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;

  const tabel = document.getElementById('geschiedenis');
  tabel.innerHTML = '';

  if (!data || data.length === 0) {
    tabel.innerHTML = `
      <tr>
        <td colspan="4">Er zijn nog geen metingen.</td>
      </tr>
    `;
    return;
  }

  // Eén meting per halfuur, maximaal 24 uur
  const halfuren = [];

  data.forEach(meting => {
    const datum = new Date(meting.created_at);

    // Halfuur bepalen (:00 of :30)
    const halfuur = new Date(datum);
    halfuur.setMinutes(datum.getMinutes() < 30 ? 0 : 30);
    halfuur.setSeconds(0);
    halfuur.setMilliseconds(0);

    const sleutel = halfuur.getTime();

    // Alleen de eerste (meest recente) meting van dit halfuur
    if (!halfuren.some(m => m.sleutel === sleutel)) {
      halfuren.push({
        sleutel: sleutel,
        meting: meting
      });
    }
  });

  const laatste336 = halfuren.slice(0, 336);

  laatste336.forEach(item => {
    const meting = item.meting;
    const datum = new Date(meting.created_at);

    const rij = document.createElement('tr');

    rij.innerHTML = `
      <td>${formatteerDatum(datum)}</td>
      <td>${meting.temperatuur} °C</td>
      <td>${meting.druk} hPa</td>
      <td>${meting.luchtvochtigheid} %</td>
    `;

    tabel.appendChild(rij);
  });

} catch (err) {
  console.error('Fout bij geschiedenis:', err);
}
}

let temperatuurGrafiek = null;
let vorigeTemperatuur = null;
let vorigeVochtigheid = null;
let vorigeDruk = null;
let huidigePeriode = 'maand';


async function haalTemperatuurGrafiekOp() {
try {
  const { data, error } = await supabaseClient
    .from('sensor_metingen')
    .select('temperatuur, created_at')
    .order('created_at', { ascending: true })
    .limit(50000);

  if (error) throw error;
  if (!data || data.length === 0) return;

  const nu = new Date();
  const startDatum = new Date();

  // =========================
  // DATUMBEREIK
  // =========================

  if (huidigePeriode === 'dag') {
    startDatum.setHours(0, 0, 0, 0);

  } else if (huidigePeriode === 'week') {
    startDatum.setDate(nu.getDate() - 7);

  } else if (huidigePeriode === 'maand') {
    startDatum.setMonth(nu.getMonth() - 1);

  } else if (huidigePeriode === 'jaar') {
    startDatum.setFullYear(nu.getFullYear() - 1);
    startDatum.setMonth(nu.getMonth(), 1);
    startDatum.setHours(0, 0, 0, 0);

  } else if (huidigePeriode === 'alles') {
    startDatum.setTime(0);
  }

  const metingen = data.filter(
    meting => new Date(meting.created_at) >= startDatum
  );

  // =========================
  // ALLES: PER JAAR EN MAAND
  // =========================

  if (huidigePeriode === 'alles') {
    const jaren = {};

    metingen.forEach(meting => {
      const datum = new Date(meting.created_at);
      const jaar = datum.getFullYear();
      const maand = datum.getMonth();

      if (!jaren[jaar]) {
        jaren[jaar] = {};
      }

      if (!jaren[jaar][maand]) {
        jaren[jaar][maand] = [];
      }

      jaren[jaar][maand].push(Number(meting.temperatuur));
    });

    const labels = [
      'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
      'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
    ];

    const datasets = [];

    Object.keys(jaren)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(jaar => {

        const gemiddelden = [];

        for (let maand = 0; maand < 12; maand++) {

          if (jaren[jaar][maand]) {

            const waarden = jaren[jaar][maand];

            const gemiddelde =
              waarden.reduce(
                (som, waarde) => som + waarde,
                0
              ) / waarden.length;

            gemiddelden.push(
              Number(gemiddelde.toFixed(1))
            );

          } else {
            // Geen metingen in deze maand
            gemiddelden.push(null);
          }
        }

        datasets.push({
          label: jaar,
          data: gemiddelden,
          tension: 0.3,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7
        });
      });

    // Oude grafiek verwijderen
    if (temperatuurGrafiek) {
      temperatuurGrafiek.destroy();
    }

    const ctx = document
      .getElementById('temperatuurGrafiek')
      .getContext('2d');

    temperatuurGrafiek = new Chart(ctx, {
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
              title: function(context) {
                return context[0].label;
              },

              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y} °C`;
              }
            },

            labelColor: function() {
              return {
                borderColor: 'transparent',
                backgroundColor: 'transparent'
              };
            }
          }
        },

        scales: {
          x: {
            title: {
              display: true,
              text: 'Maand'
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

  // =========================
  // DAG / WEEK / MAAND / JAAR
  // =========================

  const groepen = {};

  metingen.forEach(meting => {
    const datum = new Date(meting.created_at);
    let sleutel;

    if (huidigePeriode === 'dag') {

      // Per uur
      datum.setMinutes(0, 0, 0);
      sleutel = datum.getTime();

    } else if (huidigePeriode === 'jaar') {

      // Per maand
      datum.setDate(1);
      datum.setHours(0, 0, 0, 0);
      sleutel = datum.getTime();

    } else {

      // Per dag
      datum.setHours(0, 0, 0, 0);
      sleutel = datum.getTime();
    }

    if (!groepen[sleutel]) {
      groepen[sleutel] = [];
    }

    groepen[sleutel].push(
      Number(meting.temperatuur)
    );
  });

  const labels = [];
  const gemiddelden = [];
  const minimums = [];
  const maximums = [];

  Object.keys(groepen)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(sleutel => {

      const waarden = groepen[sleutel];
      const datum = new Date(Number(sleutel));

      const min = Math.min(...waarden);
      const max = Math.max(...waarden);

      const gemiddelde =
        waarden.reduce(
          (som, waarde) => som + waarde,
          0
        ) / waarden.length;

      if (huidigePeriode === 'dag') {

        labels.push(
          datum.toLocaleTimeString('nl-BE', {
            hour: '2-digit',
            minute: '2-digit'
          })
        );

      } else if (huidigePeriode === 'week') {
        labels.push(
          datum.toLocaleDateString('nl-BE', {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric'
          })
        );
      } else if (huidigePeriode === 'jaar') {

        labels.push(
          datum.toLocaleDateString('nl-BE', {
            month: 'short'
          })
        );

      } else {

        labels.push(
          datum.toLocaleDateString('nl-BE')
        );
      }

      gemiddelden.push(
        Number(gemiddelde.toFixed(1))
      );

      minimums.push(
        Number(min.toFixed(1))
      );

      maximums.push(
        Number(max.toFixed(1))
      );
    });

  // =========================
  // STATISTIEKEN VAN VANDAAG
  // =========================

  const vandaag =
    new Date().toLocaleDateString('nl-BE');

  const vandaagIndex =
    labels.indexOf(vandaag);

  if (vandaagIndex !== -1) {

    document.getElementById('tempMin').textContent =
      `${minimums[vandaagIndex].toFixed(1)} °C`;

    document.getElementById('tempGemiddeld').textContent =
      `${gemiddelden[vandaagIndex].toFixed(1)} °C`;

    document.getElementById('tempMax').textContent =
      `${maximums[vandaagIndex].toFixed(1)} °C`;
  }

  // =========================
  // GRAFIEK
  // =========================

  const ctx = document
    .getElementById('temperatuurGrafiek')
    .getContext('2d');

  if (temperatuurGrafiek) {
    temperatuurGrafiek.destroy();
  }

  temperatuurGrafiek = new Chart(ctx, {

    type: 'line',

    data: {
      labels: labels,

      datasets: [
        {
          label: 'Maximum',
          data: maximums,
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        },

        {
          label: 'Gemiddeld',
          data: gemiddelden,
          tension: 0.3,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7
        },

        {
          label: 'Minimum',
          data: minimums,
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
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

            title: function(context) {
              return context[0].label;
            },

            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y} °C`;
            }
          },

          labelColor: function() {
            return {
              borderColor: 'transparent',
              backgroundColor: 'transparent'
            };
          }
        }
      },

      scales: {

        x: {
          title: {
            display: true,

            text:
              huidigePeriode === 'dag'
                ? 'Uur'
                : huidigePeriode === 'jaar'
                  ? 'Maand'
                  : 'Dag'
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

} catch (err) {

  console.error(
    'Fout bij temperatuurgrafiek:',
    err
  );
}
}

const darkModeKnop = document.getElementById('darkModeKnop');

// Donkere modus laden bij het openen van de pagina
if (localStorage.getItem('donkereModus') === 'aan') {

document.body.classList.add('dark-mode');

darkModeKnop.textContent = '☀️';

} else {

darkModeKnop.textContent = '🌙';

}

// Donkere modus wisselen
darkModeKnop.addEventListener('click', () => {

document.body.classList.toggle('dark-mode');

const donker =
  document.body.classList.contains('dark-mode');

// Instelling bewaren
localStorage.setItem(
  'donkereModus',
  donker ? 'aan' : 'uit'
);

// Knop aanpassen
darkModeKnop.textContent =
  donker ? '☀️' : '🌙';

});

function veranderPeriode(periode, knop) {
huidigePeriode = periode;

document.querySelectorAll('.periode-knoppen button').forEach(knop => {
  knop.classList.remove('actief');
});

knop.classList.add('actief');

const titel = document.getElementById('grafiekTitel');

if (periode === 'dag') {
  titel.textContent = 'Temperatuur vandaag';
} else if (periode === 'week') {
  titel.textContent = 'Temperatuur laatste week';
} else if (periode === 'maand'){
  titel.textContent = 'Temperatuur laatste maand';
} else {
  titel.textContent = 'Temperatuur laatste jaar';
}

haalTemperatuurGrafiekOp();
}

async function haalWeersverwachtingOp() {
try {
  // Geel, België
  const latitude = 51.165;
  const longitude = 4.990;

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=2&timezone=Europe%2FBrussels`
  );

  if (!response.ok) {
    throw new Error('Weersverwachting kon niet worden opgehaald.');
  }

  const data = await response.json();

  const uren = data.hourly.time;
  const temperaturen = data.hourly.temperature_2m;
  const codes = data.hourly.weather_code;
  const regenkansen = data.hourly.precipitation_probability;

  const nu = new Date();
  const vandaag = nu.toISOString().slice(0, 10);

  let html = '';

  // De komende 6 uur tonen
  let getoond = 0;

  for (let i = 0; i < uren.length && getoond < 6; i++) {
    const tijd = new Date(uren[i]);

    if (tijd >= nu) {
      const uur = tijd.toLocaleTimeString('nl-BE', {
        hour: '2-digit',
        minute: '2-digit'
      });

    html += `
      <div class="forecast-item">
        <strong>${uur}</strong>
        <span>${weerIcoon(codes[i])}</span>
        <span>${temperaturen[i]} °C</span>
        <span>💧 ${regenkansen[i]}%</span>
      </div>
    `;

      getoond++;
    }
  }

  document.getElementById('weersverwachting').innerHTML = html;

} catch (err) {
  console.error('Fout bij weersverwachting:', err);

  document.getElementById('weersverwachting').textContent =
    'Weersverwachting kon niet worden geladen.';
}
}


function weerIcoon(code) {
if (code === 0) return '☀️';
if (code <= 3) return '🌤️';
if (code <= 48) return '🌫️';
if (code <= 67) return '🌧️';
if (code <= 77) return '🌨️';
if (code <= 82) return '🌦️';
if (code <= 86) return '🌨️';
if (code >= 95) return '⛈️';

return '🌤️';
}

async function updateTrendsBijOpstarten() {
  try {

    // Zoek de meest recente meting
    const { data: laatsteData, error: laatsteError } =
      await supabaseClient
        .from('sensor_metingen')
        .select('temperatuur, luchtvochtigheid, druk, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (laatsteError) throw laatsteError;

    if (!laatsteData || laatsteData.length === 0) {

      document.getElementById('tempTrend').textContent =
        'Nog geen trend beschikbaar';

      document.getElementById('vochtTrend').textContent =
        'Nog geen trend beschikbaar';

      document.getElementById('drukTrend').textContent =
        'Nog geen trend beschikbaar';

      return;
    }

    const huidige = laatsteData[0];

    // Tijd van ongeveer 3 uur geleden
    const drieUurGeleden = new Date(
      new Date(huidige.created_at).getTime()
      - (3 * 60 * 60 * 1000)
    );

    // Zoek de meest recente meting vóór 3 uur geleden
    const { data: oudeData, error: oudeError } =
      await supabaseClient
        .from('sensor_metingen')
        .select('temperatuur, luchtvochtigheid, druk, created_at')
        .lte('created_at', drieUurGeleden.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

    if (oudeError) throw oudeError;

    // Geen oudere meting beschikbaar
    if (!oudeData || oudeData.length === 0) {

      document.getElementById('tempTrend').textContent =
        'Nog geen trend beschikbaar';

      document.getElementById('vochtTrend').textContent =
        'Nog geen trend beschikbaar';

      document.getElementById('drukTrend').textContent =
        'Nog geen trend beschikbaar';

      return;
    }

    const oude = oudeData[0];

    // =========================
    // TEMPERATUUR
    // =========================

    const verschilTemp =
      Number(huidige.temperatuur) -
      Number(oude.temperatuur);

    const tempTrend =
      document.getElementById('tempTrend');

    if (verschilTemp > 0.1) {

      tempTrend.textContent =
        `↗ +${verschilTemp.toFixed(2).replace('.', ',')} °C`;

    } else if (verschilTemp < -0.1) {

      tempTrend.textContent =
        `↘ ${verschilTemp.toFixed(2).replace('.', ',')} °C`;

    } else {

      tempTrend.textContent =
        `↔ ${verschilTemp.toFixed(2).replace('.', ',')} °C`;
    }

    // =========================
    // LUCHTVOCHTIGHEID
    // =========================

    const verschilVocht =
      Number(huidige.luchtvochtigheid) -
      Number(oude.luchtvochtigheid);

    const vochtTrend =
      document.getElementById('vochtTrend');

    if (verschilVocht > 0.1) {

      vochtTrend.textContent =
        `↗ +${verschilVocht.toFixed(2).replace('.', ',')} %`;

    } else if (verschilVocht < -0.1) {

      vochtTrend.textContent =
        `↘ ${verschilVocht.toFixed(2).replace('.', ',')} %`;

    } else {

      vochtTrend.textContent =
        `↔ ${verschilVocht.toFixed(2).replace('.', ',')} %`;
    }

    // =========================
    // LUCHTDRUK
    // =========================

    const verschilDruk =
      Number(huidige.druk) -
      Number(oude.druk);

    const drukTrend =
      document.getElementById('drukTrend');

    if (verschilDruk > 0.5) {

      drukTrend.textContent =
        `↗ +${verschilDruk.toFixed(2).replace('.', ',')} hPa`;

    } else if (verschilDruk < -0.5) {

      drukTrend.textContent =
        `↘ ${verschilDruk.toFixed(2).replace('.', ',')} hPa`;

    } else {

      drukTrend.textContent =
        `↔ ${verschilDruk.toFixed(2).replace('.', ',')} hPa`;
    }

  } catch (err) {

    console.error(
      'Fout bij trends bij opstarten:',
      err
    );
  }
}

haalWeersverwachtingOp();

haalMeestRecenteMetingOp();

haalGeschiedenisOp();

haalTemperatuurGrafiekOp();

updateTrendsBijOpstarten();

startRealtimeLuisteraar();