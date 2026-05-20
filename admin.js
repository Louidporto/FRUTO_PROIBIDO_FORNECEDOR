// ================================================================
// 1. CONFIGURAÇÕES E INICIALIZAÇÃO
// ================================================================
let meuGrafico = null;

window.onload = () => { 
    console.log("Painel Administrativo Conectado");
    carregarProdutos(); 
    atualizarBadgeNotificacao();
};

// ================================================================
// 2. CONTROLE DE INTERFACE (ABAS E MODAL)
// ================================================================
function abrirAba(evt, nomeAba) {
    const conteudos = document.getElementsByClassName("tab-content");
    for (let i = 0; i < conteudos.length; i++) {
        conteudos[i].style.display = "none";
        conteudos[i].classList.remove("active");
    }

    const botoes = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botoes.length; i++) {
        botoes[i].classList.remove("active");
    }

    const abaAtual = document.getElementById(nomeAba);
    if(abaAtual) {
        abaAtual.style.display = "block";
        abaAtual.classList.add("active");
    }
    
    if(evt) evt.currentTarget.classList.add("active");

    if(nomeAba === 'aba-produtos') carregarProdutos();
    if(nomeAba === 'aba-solicitacoes') carregarSolicitacoes();
    if(nomeAba === 'aba-agendamentos') carregarAgenda(); // <--- Adicione ou verifique esta linha
    if(nomeAba === 'aba-financeiro') carregarRelatorioFinanceiro();
    if(nomeAba === 'aba-historico') carregarHistorico();
}

// Função Única para Abrir Modal (ajustada para limpar formulário)
function abrirModal() {
    const modal = document.getElementById('modal-cadastro');
    const form = document.getElementById('form-cadastro');


    
    form.reset(); 
    if(document.getElementById('prod-id')) document.getElementById('prod-id').value = ""; 
    document.getElementById('modal-titulo').innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar Novo Produto';
    document.getElementById('prod-tamanhos').value = ""; document.getElementById('prod-cores').value = "";
    modal.style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-cadastro').style.display = "none";
}

// ================================================================
// 3. GESTÃO DE PRODUTOS (CATÁLOGO)
// ================================================================

function carregarProdutos() {
    const grid = document.getElementById('grid-produtos');
    if (!grid) return;

    database.ref('produtos').on('value', (snapshot) => {
        grid.innerHTML = "";
        const dados = snapshot.val();        

        if (!dados) {
            grid.innerHTML = "<p class='aviso'>Nenhum produto cadastrado.</p>";
            return;
        }

        Object.keys(dados).forEach(id => {
            const p = dados[id];
            const isBloqueado = p.status === 'bloqueado';
            const imgExibicao = p.imagem ? p.imagem.split(',')[0] : 'imagens/placeholder.png';           

            grid.innerHTML += `
                <div class="card-padrao ${isBloqueado ? 'bloqueado' : ''}">
                    <img src="${imgExibicao}" class="img-card" style="${isBloqueado ? 'filter: grayscale(1); opacity: 0.5;' : ''}">
                    <div class="conteudo-card">
                        <span class="tag-categoria">${p.categoria || 'Geral'}</span>
                        <div style="display:flex; justify-content:space-between; align-items: center;">
                            <h3>${p.nome}</h3> 
                            <button class="btn-lixo" onclick="excluirItem('produtos/${id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <p style="font-size: 0.8rem; color: #777; margin: 5px 0;">${p.descricao || ''}</p>
                        <p>Estoque: <strong>${p.estoque_total || 0}</strong></p>
                        <div class="valor-tag">R$ ${p.valor ? p.valor.toFixed(2).replace('.',',') : '0,00'}</div>

                        <button onclick="alternarStatusProduto('${id}', '${p.status}')" class="btn-secundario" style="width:100%; margin-top:10px; background: ${isBloqueado ? '#2ecc71' : '#7f8c8d'}">
                            <i class="fas ${isBloqueado ? 'fa-eye' : 'fa-eye-slash'}"></i> 
                            ${isBloqueado ? ' Ativar no Catálogo' : ' Bloquear Item'}
                        </button>
                    </div>
                </div>`;
        });
    });
}

function alternarStatusProduto(id, statusAtual) {
    const novoStatus = statusAtual === 'bloqueado' ? 'ativo' : 'bloqueado';
    database.ref('produtos/' + id).update({ status: novoStatus });
}

// OUvinte do Formulário (Unificado)
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault();

    const idProduto = document.getElementById('prod-id') ? document.getElementById('prod-id').value : "";

    // Tratamento de Preço
    let valorRaw = document.getElementById('valor').value;
    let valorLimpo = valorRaw.replace('R$', '').trim().replace('.', '').replace(',', '.');
    const valorNumerico = parseFloat(valorLimpo) || 0;

    // Atualize o objeto dadosProduto dentro do seu eventListener de submit:
    const dadosProduto = {
        nome: document.getElementById('nome').value,
        imagem: document.getElementById('imagem').value || "imagens/placeholder.png",
        descricao: document.getElementById('descricao').value,
        valor: valorNumerico, 
        whatsapp: document.getElementById('whatsapp-dono').value,
        categoria: document.getElementById('prod-categoria').value.trim(),
        estoque_total: parseInt(document.getElementById('prod-estoque').value) || 0, 
        // ADICIONA ESTAS DUAS LINHAS QUE FALTAVAM PARA GRAVAR NO BANCO:
        tamanhos: document.getElementById('prod-tamanhos') ? document.getElementById('prod-tamanhos').value.trim() : "",
        cores: document.getElementById('prod-cores') ? document.getElementById('prod-cores').value.trim() : "",
        status: "ativo",
        timestamp: Date.now()
    };

    if (idProduto) {
        database.ref('produtos/' + idProduto).update(dadosProduto)
            .then(() => { alert("Atualizado!"); fecharModal(); });
    } else {
        database.ref('produtos').push(dadosProduto)
            .then(() => { alert("Cadastrado!"); fecharModal(); });
    }
});

// ================================================================
// 4. FLUXO DE PEDIDOS (SOLICITAÇÕES)
// ================================================================
function carregarSolicitacoes() {
    const lista = document.getElementById('lista-solicitacoes-pendentes');
    if (!lista) return;
    database.ref('pedidos').on('value', (snapshot) => {
        const pedidos = snapshot.val();
        lista.innerHTML = "";
        if (pedidos) {
            Object.keys(pedidos).reverse().forEach(id => {
                if (pedidos[id].status === 'pendente') {
                    lista.innerHTML += gerarHtmlCardPedido(id, pedidos[id], 'solicitacao');
                }
            });
        }
        if (lista.innerHTML === "") lista.innerHTML = "<p class='aviso'>Nenhuma nova solicitação.</p>";
    });
}

function alterarStatusPedido(id, novoStatus) {
    // 1. Atualiza o status no Firebase
    database.ref('pedidos/' + id).update({ status: novoStatus })
        .then(() => {
            if (novoStatus === 'confirmado') {
                alert("Pedido confirmado com sucesso!");
                
                // 2. Busca os dados desse pedido específico para enviar a mensagem
                database.ref('pedidos/' + id).once('value').then((snapshot) => {
                    const pedido = snapshot.val();
                    if (pedido) {
                        enviarMensagemConfirmacao(pedido, id);
                    }
                });
            }
            atualizarBadgeNotificacao();
        })
        .catch((error) => {
            console.error("Erro ao atualizar pedido:", error);
        });
}

// 3. Função auxiliar para montar e enviar a mensagem de WhatsApp (CORRIGIDA)
function enviarMensagemConfirmacao(pedido, id) {
    // Garante que o número não tenha caracteres estranhos. 
    // Se o cliente já digitou com 55 no início, evitamos duplicar.
    let numeroCliente = pedido.cliente_whatsapp.replace(/\D/g, ''); 
    if (!numeroCliente.startsWith('55') && numeroCliente.length >= 10) {
        numeroCliente = '55' + numeroCliente;
    }
    
    const idCurto = id.slice(-5).toUpperCase();
    
    // Montamos o texto usando quebras de linha normais (\n) dentro das crases
    let mensagemText = `*CONFIRMAÇÃO DE PEDIDO - FRUTO PROIBIDO*\n\n`;
    mensagemText += `Olá! Seu pedido *#${idCurto}* foi confirmado e já está em nossa agenda de preparo. 🛍️\n\n`;
    mensagemText += `*Detalhes do Pedido:*\n`;
    
    pedido.itens.forEach(item => {
        mensagemText += `- ${item.quantidade}x ${item.nome} (Tam: ${item.tamanho || 'U'}) ${item.cor}\n`;
    });
    
    mensagemText += `\n*Total:* R$ ${pedido.valor_total.toFixed(2).replace('.', ',')}\n\n`;
    mensagemText += `Agradecemos a preferência! Se tiver alguma dúvida, estamos à disposição. ✨`;

    // O encodeURIComponent transforma espaços, quebras de linha e emojis no formato correto de URL
    const linkWhatsapp = `https://wa.me/${numeroCliente}?text=${encodeURIComponent(mensagemText)}`;
    
    // Abre a API do WhatsApp de forma limpa
    window.open(linkWhatsapp, '_blank');
}

// ================================================================
// 5. FINANCEIRO E EXCLUSÃO
// ================================================================
function carregarRelatorioFinanceiro() {
    const cuerpoTabela = document.getElementById('tabela-corpo-financas');
    const faturamentoTxt = document.getElementById('faturamento-valor');

    database.ref('pedidos').on('value', snapshot => {
        const dados = snapshot.val();
        cuerpoTabela.innerHTML = "";
        let totalGeral = 0;
        let resumoGrafico = {};

        if (dados) {
            Object.keys(dados).forEach(id => {
                const p = dados[id];
                
                if (p.status === 'confirmado' || p.status === 'finalizado') {
                    totalGeral += p.valor_total;
                    
                    // MODIFICADO: Trocado p.cliente_whatsapp por p.cliente_nome para exibir na tabela
                    const nomeTabela = p.cliente_nome || 'Não Informado';
                    
                    cuerpoTabela.innerHTML += `
                        <tr>
                            <td>#${id.slice(-5).toUpperCase()}</td>
                            <td>${nomeTabela}</td>
                            <td>R$ ${p.valor_total.toFixed(2).replace('.',',')}</td>
                        </tr>`;

                    if(p.itens) {
                        p.itens.forEach(item => {
                            resumoGrafico[item.nome] = (resumoGrafico[item.nome] || 0) + (item.preco * item.quantidade);
                        });
                    }
                }
            });
        }
        faturamentoTxt.innerText = totalGeral.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
        atualizarGrafico(resumoGrafico);
    });
}
function atualizarGrafico(resumo) {
    const canvas = document.getElementById('graficoDesempenho');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (meuGrafico) meuGrafico.destroy();

    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(resumo),
            datasets: [{
                label: 'Vendas por Produto (R$)',
                data: Object.values(resumo),
                backgroundColor: '#7b001c',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function excluirItem(caminho) {
    if(confirm("Tem certeza que deseja excluir permanentemente?")) {
        database.ref(caminho).remove().then(() => alert("Removido com sucesso!"));
    }
}

function carregarAgenda() {
    const lista = document.getElementById('lista-agendamentos');
    if (!lista) return;
    database.ref('pedidos').on('value', (snapshot) => {
        const pedidos = snapshot.val();
        lista.innerHTML = "";
        if (pedidos) {
            Object.keys(pedidos).reverse().forEach(id => {
                if (pedidos[id].status === 'confirmado') {
                    lista.innerHTML += gerarHtmlCardPedido(id, pedidos[id], 'agenda');
                }
            });
        }
        if (lista.innerHTML === "") lista.innerHTML = "<p class='aviso'>Agenda vazia.</p>";
    });
}

// Função mestre para criar o HTML dos cards (Padronizado - Atualizado com Nome do Cliente)
function gerarHtmlCardPedido(id, pedido, tipoAba) {
    const data = new Date(pedido.data).toLocaleString('pt-BR');
    const idCurto = id.slice(-5).toUpperCase();
    const whatsappLimpo = pedido.cliente_whatsapp ? pedido.cliente_whatsapp.replace(/\D/g, '') : '';
    const nomeCliente = pedido.cliente_nome || 'Não Informado';

    // Gera a lista de itens com miniaturas (estilo carrinho)
    const itensHtml = pedido.itens ? pedido.itens.map(item => `
        <div class="item-solicitacao-mini">
            <img src="${item.imagem || 'imagens/placeholder.png'}" class="img-mini-solicitacao">
            <div class="info-mini">
                <span class="nome-prod">${item.quantidade}x ${item.nome}</span>
                <span class="detalhe-prod">Tam: ${item.tamanho || 'U'} | ${item.cor} | R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    `).join('') : '<p>Sem itens cadastrados</p>';

    // Define botões baseados na aba
    let botoesAcao = '';
    if (tipoAba === 'solicitacao') {
        botoesAcao = `
            <button onclick="alterarStatusPedido('${id}', 'confirmado')" class="btn-aprovar-curto">
                <i class="fas fa-check"></i> Confirmar
            </button>
            <button onclick="excluirItem('pedidos/${id}')" class="btn-recusar-curto">
                <i class="fas fa-trash"></i>
            </button>`;
    } else if (tipoAba === 'agenda') {
        botoesAcao = `
            <button onclick="alterarStatusPedido('${id}', 'finalizado')" class="btn-acao-principal" style="background:#2980b9; flex:2;">
                <i class="fas fa-archive"></i> Finalizar/Arquivar
            </button>
            <button onclick="excluirItem('pedidos/${id}')" class="btn-recusar-curto">
                <i class="fas fa-trash"></i>
            </button>`;
    }

    return `
        <div class="card-solicitacao ${tipoAba === 'agenda' ? 'confirmado' : ''}">
            <div class="solicitacao-header">
                <span><strong>Pedido #${idCurto}</strong></span>
                <span class="data-badge">${data}</span>
            </div>
            
            <div class="cliente-info-card" style="padding: 10px 15px 5px 15px; font-size: 1rem; color: #7b001c;">
                <i class="fas fa-user"></i> Cliente: <strong>${nomeCliente}</strong>
            </div>
            
            <div class="lista-itens-solicitacao">
                ${itensHtml}
            </div>

            <div class="solicitacao-footer">
                <div class="total-solicitacao">Total: <strong>R$ ${pedido.valor_total.toFixed(2).replace('.', ',')}</strong></div>
                
                <a href="https://wa.me/55${whatsappLimpo}" target="_blank" class="btn-whatsapp-direto">
                    <i class="fab fa-whatsapp"></i> Falar com Cliente
                </a>

                <div class="acoes-pedido" style="display:flex; gap:10px;">
                    ${botoesAcao}
                </div>
            </div>
        </div>`;
}

function carregarHistorico() {
    const lista = document.getElementById('lista-historico'); // Certifique-se de ter esse ID no HTML
    if (!lista) return;

    database.ref('pedidos').on('value', (snapshot) => {
        const pedidos = snapshot.val();
        lista.innerHTML = "";
        if (pedidos) {
            Object.keys(pedidos).reverse().forEach(id => {
                // Filtra apenas os pedidos finalizados
                if (pedidos[id].status === 'finalizado') {
                    lista.innerHTML += gerarHtmlCardPedido(id, pedidos[id], 'historico');
                }
            });
        }
        if (lista.innerHTML === "") lista.innerHTML = "<p class='aviso'>Nenhum pedido no histórico.</p>";
    });
}
