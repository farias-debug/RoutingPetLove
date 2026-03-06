"""
Fallback de tipo/frota quando a placa nao estiver cadastrada em dim_placas_veiculos.xlsx.
"""

DE_PARA_TIPO = {
    "VAN-COM-8H-DED": {"Tipo de Veiculo Padrao": "Van", "Tipo Frota": "Dedicado"},
    "UTI-COM-8H-DED": {
        "Tipo de Veiculo Padrao": "Veículo Utilitário",
        "Tipo Frota": "Dedicado",
    },
    "Veículo de Passeio": {
        "Tipo de Veiculo Padrao": "Veículo Passeio",
        "Tipo Frota": "Dedicado",
    },
    "VAN-ELE-8H-DED": {"Tipo de Veiculo Padrao": "Van", "Tipo Frota": "Dedicado"},
    "UTI-ELE-8H-DED": {
        "Tipo de Veiculo Padrao": "Veículo Utilitário",
        "Tipo Frota": "Dedicado",
    },
    "UTI-COM-8H-AGR": {
        "Tipo de Veiculo Padrao": "Veículo Utilitário",
        "Tipo Frota": "Agregado",
    },
    "PAS-COM-8H-AGR": {
        "Tipo de Veiculo Padrao": "Veículo Passeio",
        "Tipo Frota": "Agregado",
    },
    "Utilitários": {
        "Tipo de Veiculo Padrao": "Veículo Utilitário",
        "Tipo Frota": "Tipo não selecionado",
    },
    "Van": {"Tipo de Veiculo Padrao": "Van", "Tipo Frota": "Tipo não selecionado"},
    "VAN-COM-8H-AGR": {"Tipo de Veiculo Padrao": "Van", "Tipo Frota": "Agregado"},
    "Motocicleta": {
        "Tipo de Veiculo Padrao": "Motocicleta",
        "Tipo Frota": "Tipo não selecionado",
    },
    "VAN-COM-12H-AGR": {"Tipo de Veiculo Padrao": "Van", "Tipo Frota": "Agregado"},
    "VUC-COM-8H-AGR": {"Tipo de Veiculo Padrao": "Vuc", "Tipo Frota": "Agregado"},
    "Carro": {
        "Tipo de Veiculo Padrao": "Veículo Passeio",
        "Tipo Frota": "Tipo não selecionado",
    },
    "E-Utilitário Last Mile": {
        "Tipo de Veiculo Padrao": "Veículo Utilitário",
        "Tipo Frota": "Tipo não selecionado",
    },
    "3/4/Médio": {
        "Tipo de Veiculo Padrao": "3/4/Médio",
        "Tipo Frota": "Tipo não selecionado",
    },
    "Truck": {"Tipo de Veiculo Padrao": "Truck", "Tipo Frota": "Tipo não selecionado"},
    "eVan Própria": {"Tipo de Veiculo Padrao": "Van", "Tipo Frota": "Própria"},
    "Carreta*": {
        "Tipo de Veiculo Padrao": "Carreta",
        "Tipo Frota": "Tipo não selecionado",
    },
    "Fiorino": {
        "Tipo de Veiculo Padrao": "Fiorino",
        "Tipo Frota": "Tipo não selecionado",
    },
    "ePasseio Próprio": {
        "Tipo de Veiculo Padrao": "Veículo Passeio",
        "Tipo Frota": "Própria",
    },
    "Carreta": {
        "Tipo de Veiculo Padrao": "Carreta",
        "Tipo Frota": "Tipo não selecionado",
    },
    "Tipo não selecionado": {
        "Tipo de Veiculo Padrao": "Tipo não selecionado",
        "Tipo Frota": "Tipo não selecionado",
    },
}

FALLBACK_TIPO = {
    "Tipo de Veiculo Padrao": "Tipo não selecionado",
    "Tipo Frota": "Tipo não selecionado",
}


def aplicar_de_para_tipo(tipo_original):
    """Aplica o fallback a partir da coluna Tipo."""
    chave = "" if tipo_original is None else str(tipo_original).strip()
    return DE_PARA_TIPO.get(chave, FALLBACK_TIPO)
