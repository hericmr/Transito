// Código para exibir a div "resultado" ao clicar no botão
document.getElementById('verificarBtn').addEventListener('click', function () {
    document.getElementById('resultado').classList.remove('hidden');
});

let apiKey = "6644e8ea-8a29-11ef-9159-0242ac130003-6644e94e-8a29-11ef-9159-0242ac130003";
const lat = -23.9608;
const lon = -46.3336;

document.getElementById('verificarBtn').addEventListener('click', async () => {
    await verificarCondicoes();  // Chama a função verificarCondicoes ao clicar no botão
});

// Função para verificar se é verão
function ehVerao() {
    const agora = new Date();
    const mes = agora.getMonth() + 1; // Obtemos o mês (0 = janeiro, 11 = dezembro)
    return (mes === 12 || mes === 1 || mes === 2); // Verão no Brasil é de dezembro a fevereiro
}

async function verificarCondicoes() {
    const statusDiv = document.getElementById('status');
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = ''; // Limpa o resultado
    statusDiv.textContent = 'Verificando...';

    try {
        const [faseDaLua, choveu, { mareAlta, mareBaixa }] = await Promise.all([
            checarFaseDaLua(),
            checarChuva(),
            checarMare()
        ]);

        // Atualiza o status após a verificação
        statusDiv.textContent = 'Condições de mergulho verificadas!';
        let resultadoHtml = '';

        // Verificar se é verão
        if (ehVerao()) {
            resultadoHtml += '<p><strong>Estamos no verão!</strong> Condições favoráveis para mergulho!</p>';
        } else {
            resultadoHtml += '<p>Ainda não estamos no verão. A melhor época para mergulho costuma ser entre dezembro e fevereiro.</p>';
        }

        // Exibe a fase da lua
        resultadoHtml += `<p><strong>Fase da lua:</strong> ${faseDaLua.texto}</p>`;
        resultadoHtml += faseDaLua.quartoCrescente ? 
            '<p>A lua está em Quarto Crescente, condições favoráveis para mergulho!</p>' : 
            '<p>A lua ainda não está em Quarto Crescente.</p>';

        // Verifica se choveu
        resultadoHtml += choveu ? 
            '<p>Choveu nos últimos 3 dias, a visibilidade pode estar ruim para mergulho.</p>' : 
            '<p>Não choveu nos últimos 3 dias, a visibilidade na água fica melhor assim.</p>';

        // Exibe informações de maré
        resultadoHtml += mareAlta.length > 0 ? 
            '<p><strong>Próximas marés altas:</strong></p>' + mareAlta.map(mare => 
                `<p>Maré alta em: ${new Date(mare).toLocaleString()}</p>`).join('') : 
            '<p>Nenhuma informação de maré alta disponível.</p>';

        resultadoHtml += mareBaixa.length > 0 ? 
            '<p><strong>Próximas marés baixas:</strong></p>' + mareBaixa.map(mare => 
                `<p>Maré baixa em: ${new Date(mare).toLocaleString()}</p>`).join('') : 
            '<p>Nenhuma informação de maré baixa disponível.</p>';

        resultadoDiv.innerHTML = resultadoHtml;

        // Preparar os dados para o gráfico
        const chartData = {
            labels: [...mareAlta.map(m => new Date(m).toLocaleString()), ...mareBaixa.map(m => new Date(m).toLocaleString())],
            datasets: [{
                label: 'Marés',
                data: [...mareAlta.map(() => 1), ...mareBaixa.map(() => 0)], // 1 para alta, 0 para baixa
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };


    } catch (error) {
        console.error(error);
        statusDiv.textContent = 'Erro ao verificar as condições. Tente novamente mais tarde.';
    }
}

async function checarFaseDaLua() {
    const start = Math.floor(Date.now() / 1000);
    const url = `https://api.stormglass.io/v2/astronomy/point?lat=${lat}&lng=${lon}&start=${start}`;

    const resposta = await fetch(url, {
        headers: { 'Authorization': apiKey }
    });

    if (resposta.ok) {
        const dados = await resposta.json();
        const faseLua = dados.data[0].moonPhase.current.text;
        return {
            texto: faseLua,
            quartoCrescente: faseLua === 'First quarter'
        };
    } else {
        throw new Error('Erro ao consultar a fase da lua.');
    }
}

async function checarChuva() {
    const start = Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60);
    const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lon}&start=${start}&params=precipitation`;

    const resposta = await fetch(url, {
        headers: { 'Authorization': apiKey }
    });

    if (resposta.ok) {
        const dados = await resposta.json();
        for (let entry of dados.hours) {
            if (entry.precipitation.sg > 0) {
                return true;
            }
        }
        return false;
    } else {
        throw new Error('Erro ao consultar a chuva.');
    }
}

async function checarMare() {
    const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lon}`;

    const resposta = await fetch(url, {
        headers: { 'Authorization': apiKey }
    });

    if (resposta.ok) {
        const dados = await resposta.json();
        const mareAlta = dados.data.filter(mare => mare.type === 'high').map(mare => mare.time);
        const mareBaixa = dados.data.filter(mare => mare.type === 'low').map(mare => mare.time);
        
        return { mareAlta, mareBaixa };
    } else {
        throw new Error('Erro ao consultar as marés.');
    }
}