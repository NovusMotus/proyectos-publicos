#!/usr/bin/env bash
# Regenera los catálogos y todos sus derivados, en orden. Uso: bash regenerar_todo.sh
set -e
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
python catalogo/unir_catalogo.py                 # 1. une raw/ + excluir.txt + correcciones CIE-10-ES
python catalogo_especialidades/unir_especialidades.py
(cd cie10es && python validar_cie10.py)          # 2. valida códigos contra CIE-10-ES 2026
python catalogo/rae_cmbd/cobertura2.py > catalogo/rae_cmbd/cobertura_resultado.txt
python catalogo_especialidades/rae_cmbd/cobertura_especialidades.py > catalogo_especialidades/rae_cmbd/cobertura_resultado.txt
python frecuencias_rae.py                        # 3. probabilidades a priori (genera *_con_prior.tsv)
python demografia_rae.py                         # 4. añade edad, sexo, estancia y comorbilidades a *_con_prior.tsv
