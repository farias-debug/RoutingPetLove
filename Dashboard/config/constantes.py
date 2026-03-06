"""
Constantes do dashboard: renomeacao de colunas, parsing e tipos padronizados.
"""

NOMES_COLUNAS = {
    "Id Carga": "IdCarga",
    "status": "Status",
    "N° Placa": "Placa",
    "Nº Placa": "Placa",
    "NÂ° Placa": "Placa",
    "NÂº Placa": "Placa",
    "Tipo": "Tipo",
    "Motorista": "Motorista",
    "CPF Motorista": "CPF",
    "Transportador": "Transportador",
    "Rota": "Rota",
    "Filial": "Filial",
    "Ajudante": "Ajudante",
    "Perfomance": "Performance (%)",
    "Usuário Carregamento": "Usuario Carregamento",
    "UsuÃ¡rio Carregamento": "Usuario Carregamento",
    "dtabertura": "Data de Abertura",
    "Data de carregamento": "Data de Carregamento",
    "referencia": "Data Referencia",
    "Data Atribuição Motorista": "Data Atribuicao Motorista",
    "Data AtribuiÃ§Ã£o Motorista": "Data Atribuicao Motorista",
    "Data Inicio de Rota APP": "Data Inicio Rota",
    "Primeira Baixa": "Primeira Baixa",
    "Última Baixa": "Ultima Baixa",
    "Ãšltima Baixa": "Ultima Baixa",
    "Quantidade": "Pedidos da Rota",
    "Quantidade Volumes": "Volumes da Rota",
    "Peso": "Peso (kg)",
    "Paradas": "Paradas",
    "Clientes": "Clientes",
    "Entregues": "Entregues",
    "Insucessos": "Insucessos",
    "baixas": "Baixas",
    "Km Planejado": "KM Planejado",
    "Km Realizado": "KM Realizado",
    "Tempo Planejado": "Tempo Planejado (h)",
    "Tempo Realizado": "Tempo Realizado (h)",
    "Valor Pagamento Carga": "Valor Pagamento Carga",
    "Valor Pagamento Rota": "Valor Pagamento Rota",
    "Valor Pagamento Remessas": "Valor Pagamento Remessas",
    "Valor Pagamento Km": "Valor Pagamento Km",
}

COLUNAS_DATA = [
    "Data de Abertura",
    "Data de Carregamento",
    "Data Referencia",
    "Data Atribuicao Motorista",
    "Data Inicio Rota",
    "Primeira Baixa",
    "Ultima Baixa",
]

COLUNAS_DURACAO = [
    "Tempo Planejado (h)",
    "Tempo Realizado (h)",
]

COLUNAS_NUMERICAS = [
    "Pedidos da Rota",
    "Volumes da Rota",
    "Peso (kg)",
    "Paradas",
    "Clientes",
    "Entregues",
    "Insucessos",
    "Baixas",
    "KM Planejado",
    "KM Realizado",
    "Valor Pagamento Carga",
    "Valor Pagamento Rota",
    "Valor Pagamento Remessas",
    "Valor Pagamento Km",
]

COLUNAS_PERCENTUAL = [
    "Performance (%)",
]

TIPOS_VEICULO = [
    {"TipoVeiculo": "Motocicleta", "Categoria": "Leve", "Ordem": 1},
    {"TipoVeiculo": "Fiorino", "Categoria": "Leve", "Ordem": 2},
    {"TipoVeiculo": "Veículo Passeio", "Categoria": "Leve", "Ordem": 3},
    {"TipoVeiculo": "Veículo Utilitário", "Categoria": "Leve", "Ordem": 4},
    {"TipoVeiculo": "Van", "Categoria": "Medio", "Ordem": 5},
    {"TipoVeiculo": "Vuc", "Categoria": "Medio", "Ordem": 6},
    {"TipoVeiculo": "3/4/Médio", "Categoria": "Pesado", "Ordem": 7},
    {"TipoVeiculo": "Toco", "Categoria": "Pesado", "Ordem": 8},
    {"TipoVeiculo": "Truck", "Categoria": "Pesado", "Ordem": 9},
    {"TipoVeiculo": "Carreta", "Categoria": "Pesado", "Ordem": 10},
    {"TipoVeiculo": "Tipo não selecionado", "Categoria": "Outros", "Ordem": 11},
]

JANELA_CAPACIDADE_DIAS = 90

POWERBI_SEPARATOR = ";"
POWERBI_ENCODING = "utf-8-sig"
POWERBI_DATE_FORMAT = "%Y-%m-%d"
