"""
Winemaking Decision Tree Engine

Parses mermaid flowchart diagrams and traverses them based on wine parameters
to generate technology steps for wine production.
"""

import re
import json
import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MERMAID_PATH = os.path.join(_BASE_DIR, 'concept', 'scheme_logic.mermaid')
CONDITIONS_PATH = os.path.join(_BASE_DIR, 'data', 'conditions_map.json')

_graph_cache = None
_conditions_cache = None

# ---------------------------------------------------------------------------
# Phase 1a: Mermaid Parser
# ---------------------------------------------------------------------------

_ACTION_RE = re.compile(r'([A-Z_][A-Z0-9_]*)\["([^"]*)"\]')
_DECISION_RE = re.compile(r'([A-Z_][A-Z0-9_]*)\{"([^"]*)"\}')
_SECTION_RE = re.compile(r'%%\s*═+\s*(.*?)\s*═+')
_NODE_ID_RE = re.compile(r'[A-Z_][A-Z0-9_]*')


def parse_mermaid(filepath=None):
    """Parse a mermaid flowchart file into a graph structure.

    Returns dict with:
      nodes  – {id: {type, label, section}}
      edges  – [{from, to, label}]
      root   – id of the first node encountered
      adj    – {id: [outgoing edges]}  (adjacency list)
    """
    if filepath is None:
        filepath = MERMAID_PATH

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    nodes = {}
    edges = []
    current_section = None
    root = None

    for line in content.split('\n'):
        stripped = line.strip()

        if not stripped or stripped.startswith('flowchart'):
            continue

        if stripped.startswith('%%'):
            m = _SECTION_RE.search(stripped)
            if m:
                current_section = m.group(1).strip()
            continue

        # --- extract node definitions ---
        for m in _ACTION_RE.finditer(stripped):
            nid, label = m.group(1), m.group(2)
            if nid not in nodes:
                nodes[nid] = {'type': 'action', 'label': label,
                              'section': current_section}
                if root is None:
                    root = nid
            elif nodes[nid]['label'] == nid:
                nodes[nid].update({'type': 'action', 'label': label,
                                   'section': current_section})

        for m in _DECISION_RE.finditer(stripped):
            nid, label = m.group(1), m.group(2)
            if nid not in nodes:
                nodes[nid] = {'type': 'decision', 'label': label,
                              'section': current_section}
                if root is None:
                    root = nid
            elif nodes[nid]['label'] == nid:
                nodes[nid].update({'type': 'decision', 'label': label,
                                   'section': current_section})

        # --- simplify line for edge parsing ---
        simplified = _ACTION_RE.sub(lambda m: m.group(1), stripped)
        simplified = _DECISION_RE.sub(lambda m: m.group(1), simplified)

        if '-->' not in simplified:
            continue

        parts = simplified.split('-->')

        for i in range(len(parts) - 1):
            left = parts[i].strip()
            right = parts[i + 1].strip()

            edge_label = None
            source_text = left

            if ' -- ' in left:
                idx = left.rfind(' -- ')
                source_text = left[:idx].strip()
                edge_label = left[idx + 4:].strip().strip('"')

            src_match = _NODE_ID_RE.findall(source_text)
            tgt_match = _NODE_ID_RE.findall(right)

            if not src_match or not tgt_match:
                continue

            src_id = src_match[-1]
            tgt_id = tgt_match[0]

            for nid in (src_id, tgt_id):
                if nid not in nodes:
                    nodes[nid] = {'type': 'action', 'label': nid,
                                  'section': current_section}
                    if root is None:
                        root = nid

            edges.append({'from': src_id, 'to': tgt_id, 'label': edge_label})

    adj = {}
    for e in edges:
        adj.setdefault(e['from'], []).append(e)

    return {'nodes': nodes, 'edges': edges, 'root': root, 'adj': adj}


def get_graph():
    """Return cached parsed graph."""
    global _graph_cache
    if _graph_cache is None:
        _graph_cache = parse_mermaid()
    return _graph_cache


def get_conditions_map():
    """Return cached conditions map."""
    global _conditions_cache
    if _conditions_cache is None:
        with open(CONDITIONS_PATH, 'r', encoding='utf-8') as f:
            _conditions_cache = json.load(f)
    return _conditions_cache


# ---------------------------------------------------------------------------
# Phase 1c: Traversal Engine
# ---------------------------------------------------------------------------

def _resolve_param(path, wine_data):
    """Resolve a dotted path like 'style_tech.pH' from wine_data."""
    keys = path.split('.')
    val = wine_data
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        else:
            return None
    return val


def _to_num(val, default=0):
    """Safely convert to float."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _find_edge(outgoing_edges, label):
    """Find an edge by its label."""
    for e in outgoing_edges:
        if e.get('label') == label:
            return e
    return None


def _evaluate_condition(node_id, wine_data, conditions_map, outgoing_edges,
                        ctx=None):
    """Pick the correct outgoing edge from a decision node.

    Returns the chosen edge dict, or None if no match.
    """
    spec = conditions_map.get(node_id)
    if spec is None:
        if len(outgoing_edges) == 1:
            return outgoing_edges[0]
        unlabeled = [e for e in outgoing_edges if e.get('label') is None]
        if unlabeled:
            return unlabeled[0]
        return outgoing_edges[0] if outgoing_edges else None

    ctype = spec.get('type', 'param_match')

    if ctype == 'default_edge':
        target = spec.get('edge')
        return _find_edge(outgoing_edges, target) or (
            outgoing_edges[0] if outgoing_edges else None)

    if ctype == 'engine':
        resolver_name = spec.get('resolver', '')
        resolver = _ENGINE_RESOLVERS.get(resolver_name)
        if resolver:
            label = resolver(wine_data, outgoing_edges, ctx)
            if label:
                edge = _find_edge(outgoing_edges, label)
                if edge:
                    return edge
        return outgoing_edges[0] if outgoing_edges else None

    if ctype == 'param_match':
        param_val = _resolve_param(spec['param'], wine_data)
        if param_val is None:
            param_val = spec.get('default', '')
        param_val = str(param_val)
        mapping = spec.get('mapping', {})
        target_label = mapping.get(param_val)
        if target_label is None:
            for k, v in mapping.items():
                if k.lower() == param_val.lower():
                    target_label = v
                    break
        if target_label is None:
            target_label = mapping.get('_default')
        if target_label is not None:
            edge = _find_edge(outgoing_edges, target_label)
            if edge:
                return edge
        return outgoing_edges[0] if outgoing_edges else None

    if ctype == 'threshold':
        param_val = _to_num(_resolve_param(spec['param'], wine_data))
        op = spec.get('op', '>=')
        threshold = spec.get('value', 50)
        ops = {'>=': lambda a, b: a >= b, '>': lambda a, b: a > b,
               '<=': lambda a, b: a <= b, '<': lambda a, b: a < b,
               '==': lambda a, b: a == b}
        result = ops.get(op, ops['>='])(param_val, threshold)
        target_label = spec.get('yes', 'Так') if result else spec.get('no', 'Ні')
        return _find_edge(outgoing_edges, target_label) or (
            outgoing_edges[0] if outgoing_edges else None)

    if ctype == 'cascading':
        for cond in spec.get('conditions', []):
            if _eval_expr(cond['expr'], wine_data):
                edge = _find_edge(outgoing_edges, cond['edge'])
                if edge:
                    return edge
                break
        default_label = spec.get('default')
        if default_label:
            edge = _find_edge(outgoing_edges, default_label)
            if edge:
                return edge
        return outgoing_edges[-1] if outgoing_edges else None

    if ctype == 'compound':
        params = {}
        for alias, path in spec.get('params', {}).items():
            params[alias] = _resolve_param(path, wine_data)
        for cond in spec.get('conditions', []):
            if _eval_compound(cond['expr'], params):
                edge = _find_edge(outgoing_edges, cond['edge'])
                if edge:
                    return edge
                break
        default_label = spec.get('default')
        if default_label:
            edge = _find_edge(outgoing_edges, default_label)
            if edge:
                return edge
        return outgoing_edges[-1] if outgoing_edges else None

    return outgoing_edges[0] if outgoing_edges else None


def _eval_expr(expr, wine_data):
    """Evaluate a simple expression against wine_data.

    Supports: param >= value, param > value, param == value,
    param == 'string', and compound with 'and' / 'or'.
    """
    expr = expr.strip()

    if ' and ' in expr:
        parts = expr.split(' and ')
        return all(_eval_expr(p, wine_data) for p in parts)
    if ' or ' in expr:
        parts = expr.split(' or ')
        return any(_eval_expr(p, wine_data) for p in parts)

    for op in ('>=', '<=', '!=', '==', '>', '<'):
        if op in expr:
            left, right = expr.split(op, 1)
            left = left.strip()
            right = right.strip()
            left_val = _resolve_param(left, wine_data)
            right_stripped = right.strip("'\"")
            try:
                right_val = float(right_stripped)
                left_val = _to_num(left_val)
            except ValueError:
                right_val = right_stripped
                left_val = str(left_val) if left_val is not None else ''

            if op == '>=':
                return left_val >= right_val
            elif op == '<=':
                return left_val <= right_val
            elif op == '>':
                return left_val > right_val
            elif op == '<':
                return left_val < right_val
            elif op == '==':
                return left_val == right_val
            elif op == '!=':
                return left_val != right_val

    return False


def _eval_compound(expr, params):
    """Evaluate expression with pre-resolved params dict."""
    expr = expr.strip()
    if ' and ' in expr:
        parts = expr.split(' and ')
        return all(_eval_compound(p, params) for p in parts)
    if ' or ' in expr:
        parts = expr.split(' or ')
        return any(_eval_compound(p, params) for p in parts)

    for op in ('>=', '<=', '!=', '==', '>', '<'):
        if op in expr:
            left, right = expr.split(op, 1)
            left = left.strip()
            right = right.strip().strip("'\"")
            left_val = params.get(left)
            try:
                right_val = float(right)
                left_val = _to_num(left_val)
            except ValueError:
                right_val = right
                left_val = str(left_val) if left_val is not None else ''

            if op == '>=':
                return left_val >= right_val
            elif op == '<=':
                return left_val <= right_val
            elif op == '>':
                return left_val > right_val
            elif op == '<':
                return left_val < right_val
            elif op == '==':
                return left_val == right_val
            elif op == '!=':
                return left_val != right_val

    return False


# ---------------------------------------------------------------------------
# Engine resolvers — complex conditions computed in Python
# ---------------------------------------------------------------------------

_AROMATIC_VARIETIES = {
    'muscat', 'gewurztraminer', 'riesling', 'sauvignon blanc',
    'gewürztraminer',
}
_WHITE_NEUTRAL_VARIETIES = {'chardonnay', 'pinot gris', 'pinot grigio'}
_RED_DELICATE_VARIETIES = {'pinot noir', 'gamay'}
_RED_STRUCTURED_VARIETIES = {
    'cabernet sauvignon', 'merlot', 'malbec', 'nebbiolo',
    'syrah', 'shiraz', 'saperavi',
}
_BDN_VARIETIES = {'pinot noir', 'pinot meunier'}


def _get_color(wd):
    return (wd.get('color', {}).get('color') or 'Біле').strip()


def _get_scheme(wd):
    return (wd.get('color', {}).get('fermentation_scheme') or 'white').strip()


def _get_variety(wd):
    return (wd.get('color', {}).get('grapeVariety') or 'unknown').strip().lower()


def _is_sparkling(wd):
    co2 = wd.get('style_co2', {})
    t = str(co2.get('co2Type', co2.get('type', 'still'))).lower()
    return t not in ('still', 'тихе', '')


def _is_skin_fermentation(wd):
    color = _get_color(wd)
    scheme = _get_scheme(wd)
    if color == 'Помаранчеве':
        return True
    if color == 'Червоне' and scheme in ('red', 'Червона', 'червона'):
        return True
    if color == 'Рожеве' and scheme not in ('white', 'Біла', 'біла'):
        return True
    return False


def _sweetness_cat(wd):
    sp = wd.get('style_params', wd.get('style', {}))
    return str(sp.get('sweetnessCategory', sp.get('style', 'suhe'))).lower()


def _raw_color_label(wd):
    """Map color.color to mermaid edge labels used in raw_color nodes."""
    color = _get_color(wd)
    scheme = _get_scheme(wd)
    if scheme in ('blanc_de_noirs', 'Блан де нуар') or color == 'Blanc de Noir':
        return 'Блан де нуар'
    m = {
        'Біле': 'Біле', 'Рожеве': 'Рожеве', 'Червоне': 'Червоне',
        'Помаранчеве': 'Помаранчеве', 'Блан де нуар': 'Блан де нуар',
    }
    return m.get(color, 'Біле')


# ---------------------------------------------------------------------------
# Nitrogen / YAN calculation module
# ---------------------------------------------------------------------------

_GRAPE_YAN_PATH = os.path.join(_BASE_DIR, 'data', 'grape_yan.json')
_grape_yan_cache = None


def _load_grape_yan():
    global _grape_yan_cache
    if _grape_yan_cache is None:
        with open(_GRAPE_YAN_PATH, 'r', encoding='utf-8') as f:
            _grape_yan_cache = json.load(f)
    return _grape_yan_cache


def _get_yan_estimate(wd):
    """Return estimated YAN in mg/L for the grape variety (or fallback by color)."""
    data = _load_grape_yan()
    variety = _get_variety(wd)
    vinfo = data['varieties'].get(variety)
    if vinfo:
        return vinfo['yan_mg_l']
    color = _get_color(wd)
    color_map = {'Біле': 'white', 'Червоне': 'red', 'Рожеве': 'rose',
                 'Помаранчеве': 'orange'}
    key = color_map.get(color, 'white')
    return data['fallback_by_color'].get(key, 150)


def _get_yan_category(yan_mg_l):
    """Map numeric YAN (mg/L) to categorical level used by the decision tree."""
    if yan_mg_l < 140:
        return 'low'
    if yan_mg_l <= 200:
        return 'normal'
    return 'high'


def _get_yan_target(wd):
    """Target YAN (mg/L) for comfortable fermentation given wine style."""
    data = _load_grape_yan()
    targets = data['yan_targets_mg_l']
    variety = _get_variety(wd)
    aromatics = data.get('aromatic_varieties', [])

    if _is_sparkling(wd):
        return targets.get('sparkling', 250)

    color = _get_color(wd)
    is_dry = _sweetness_cat(wd) in ('suhe', 'сухе', 'dry')

    if color in ('Біле', 'Помаранчеве'):
        if variety in aromatics and is_dry:
            return targets.get('white_aromatic', 300)
        return targets.get('white_dry' if is_dry else 'white_not_dry', 250)

    if color == 'Рожеве':
        return targets.get('rose_dry' if is_dry else 'rose_not_dry', 200)

    return targets.get('red_dry' if is_dry else 'red_not_dry', 200)


def _calc_nutrient_nitrogen(dose_g_dal, wd):
    """Effective assimilable N (mg/L) from complex nutrient at given dose.

    Formula from Deменкова (2026):
      N_eff = dose × DAP_frac × NH4_from_DAP × assimilation_rate × 100
    The ×100 converts g/dal → mg/L (1 g/dal = 1g/10L = 100 mg/L).
    """
    data = _load_grape_yan()
    c = data['calculation_constants']['complex_nutrient']
    rate = (c['assimilation_rate_red'] if _is_skin_fermentation(wd)
            else c['assimilation_rate_white'])
    return dose_g_dal * c['dap_fraction'] * c['nh4_from_dap'] * rate * 100


def _calc_lees_dose(deficit_mg_l):
    """Yeast lees dose (g/dal) to cover nitrogen deficit (mg/L).

    1 g dry inactivated lees → 0.008 g accessible N.
    deficit in mg/L → g/dal = deficit / (0.008 × 100).
    """
    data = _load_grape_yan()
    eff = data['calculation_constants']['yeast_lees']['effective_n_per_gram']
    dose = deficit_mg_l / (eff * 100)
    max_dose = data['calculation_constants'].get('lees_max_dose_g_dal', 30)
    return min(round(dose, 1), max_dose)


def calculate_feed_recommendation(wd):
    """Calculate nitrogen supplementation recommendation.

    Returns dict with:
      - yan_natural: estimated or known YAN (mg/L)
      - yan_target: target YAN (mg/L)
      - yan_category: 'low' / 'normal' / 'high'
      - has_lees: bool
      - complex_dose_g_dal: (min, max) or None
      - complex_n_effective_mg_l: float
      - lees_dose_g_dal: float or None
      - lees_n_effective_mg_l: float or None
      - deficit_mg_l: float (0 if no deficit)
      - label: compact Ukrainian label for scheme display
    """
    data = _load_grape_yan()
    calc_constants = data['calculation_constants']
    doses = calc_constants['complex_nutrient_dose_g_dal']
    lees_constants = calc_constants['yeast_lees']
    st = wd.get('style_tech', {})
    yan_level = str(st.get('yanLevel', 'unknown')).lower()
    has_lees = str(st.get('hasYeastLees', 'no')).lower() == 'yes'

    if yan_level in ('unknown', ''):
        yan_natural = _get_yan_estimate(wd)
    elif yan_level == 'low':
        yan_natural = 100
    elif yan_level == 'normal':
        yan_natural = 180
    else:
        yan_natural = 280

    yan_target = _get_yan_target(wd)
    yan_cat = _get_yan_category(yan_natural)

    raw_deficit = yan_target - yan_natural
    no_deficit = {
        'yan_natural': yan_natural,
        'yan_target': yan_target,
        'yan_category': yan_cat,
        'has_lees': has_lees,
        'complex_dose_g_dal': None,
        'complex_n_effective_mg_l': 0,
        'lees_dose_g_dal': None,
        'lees_n_effective_mg_l': None,
        'deficit_mg_l': 0,
        'label': None,
    }
    if raw_deficit <= 0:
        return no_deficit

    lees_dose = None
    lees_n = 0.0

    if has_lees:
        lees_dose = min(_calc_lees_dose(raw_deficit), 15.0)
        lees_n = lees_dose * lees_constants['effective_n_per_gram'] * 100

    deficit_after_lees = raw_deficit - lees_n

    if deficit_after_lees <= 0:
        label_parts = ['Підкормка:', f'др. осад {lees_dose:.0f} г/дал']
        return {
            'yan_natural': yan_natural,
            'yan_target': yan_target,
            'yan_category': yan_cat,
            'has_lees': has_lees,
            'complex_dose_g_dal': None,
            'complex_n_effective_mg_l': 0,
            'lees_dose_g_dal': round(lees_dose, 1),
            'lees_n_effective_mg_l': round(lees_n, 1),
            'deficit_mg_l': round(raw_deficit, 1),
            'label': '\n'.join(label_parts),
        }

    rate = (calc_constants['complex_nutrient']['assimilation_rate_red']
            if _is_skin_fermentation(wd)
            else calc_constants['complex_nutrient']['assimilation_rate_white'])
    n_per_unit = (calc_constants['complex_nutrient']['dap_fraction']
                  * calc_constants['complex_nutrient']['nh4_from_dap']
                  * rate * 100)

    needed_dose = deficit_after_lees / n_per_unit if n_per_unit > 0 else 30

    if needed_dose <= 15:
        dose_range = doses['minimal']
    elif needed_dose <= 22:
        dose_range = doses['with_lees'] if has_lees else doses['minimal']
    else:
        dose_range = doses['full']

    if needed_dose > dose_range[1]:
        dose_range = [dose_range[0], min(int(round(needed_dose + 2)), 35)]

    avg_dose = sum(dose_range) / 2
    complex_n = _calc_nutrient_nitrogen(avg_dose, wd)

    label_parts = ['Підкормка:']
    if has_lees and lees_dose and lees_dose > 0:
        label_parts.append(f'др. осад {lees_dose:.0f} г/дал')
    label_parts.append(f'компл. підк. {dose_range[0]}–{dose_range[1]} г/дал')

    return {
        'yan_natural': yan_natural,
        'yan_target': yan_target,
        'yan_category': yan_cat,
        'has_lees': has_lees,
        'complex_dose_g_dal': tuple(dose_range),
        'complex_n_effective_mg_l': round(complex_n, 1),
        'lees_dose_g_dal': round(lees_dose, 1) if lees_dose else None,
        'lees_n_effective_mg_l': round(lees_n, 1) if lees_n else None,
        'deficit_mg_l': round(max(raw_deficit, 0), 1),
        'label': '\n'.join(label_parts),
    }


def _r_grape_variety_known(wd, edges, ctx):
    v = _get_variety(wd)
    return 'Так' if v not in ('unknown', 'невідомий', '') else 'Ні'


def _r_grape_variety_white(wd, edges, ctx):
    v = _get_variety(wd)
    if v in _AROMATIC_VARIETIES:
        return 'Muscat / Gewürztraminer /\u003cbr\u003eSauvignon Blanc / Riesling'
    if v in ('chardonnay',):
        return 'Chardonnay'
    return 'Інший сорт для білого\u003cbr\u003eстилю'


def _r_grape_variety_orange(wd, edges, ctx):
    v = _get_variety(wd)
    if v == 'sauvignon blanc':
        return 'Sauvignon Blanc'
    if v in ('chardonnay', 'pinot gris', 'pinot grigio'):
        return 'Chardonnay / Pinot Gris'
    if v == 'rkatsiteli':
        return 'Rkatsiteli'
    return 'Інший сорт'


def _r_grape_variety_red(wd, edges, ctx):
    v = _get_variety(wd)
    if v in ('nebbiolo', 'cabernet sauvignon', 'merlot', 'malbec'):
        return 'Nebbiolo / Cabernet Sauvignon /\u003cbr\u003eMerlot / Malbec'
    if v == 'tempranillo':
        return 'Tempranillo'
    if v in ('sangiovese', 'cabernet franc'):
        return 'Sangiovese / Cabernet Franc'
    if v == 'pinot noir':
        return 'Pinot Noir'
    if v == 'grenache':
        return 'Grenache'
    if v in ('syrah', 'shiraz'):
        return 'Syrah / Shiraz'
    if v == 'gamay':
        return 'Gamay'
    return 'Інший сорт'


def _r_grape_variety_bdn(wd, edges, ctx):
    v = _get_variety(wd)
    if v in ('pinot noir', 'pinot meunier'):
        return 'Pinot Noir / Pinot Meunier'
    if v == 'saperavi':
        return 'Saperavi'
    return 'Інший сорт'


def _r_stem_condition_known(wd, edges, ctx):
    sc = wd.get('color', {}).get('stemCondition')
    if sc and sc not in ('unknown', ''):
        return 'Так'
    return 'Ні'


def _r_raw_color(wd, edges, ctx):
    return _raw_color_label(wd)


def _r_fermentation_scheme_bw(wd, edges, ctx):
    scheme = _get_scheme(wd)
    if scheme in ('white', 'Біла', 'біла'):
        return 'Біла'
    return 'Інша'


def _r_fermentation_scheme_rc(wd, edges, ctx):
    scheme = _get_scheme(wd)
    if scheme in ('red', 'Червона', 'червона'):
        return 'Червона'
    return 'Інша'


def _r_skin_fermentation(wd, edges, ctx):
    return 'Так' if _is_skin_fermentation(wd) else 'Ні'


def _r_is_sparkling(wd, edges, ctx):
    return 'Так' if _is_sparkling(wd) else 'Ні'


def _r_angle_check(wd, edges, ctx):
    if _is_sparkling(wd):
        return 'Так'
    t = _to_num(_resolve_param('style_sensory.tannins', wd))
    b = _to_num(_resolve_param('style_sensory.bitterness', wd))
    if t <= 30 and b <= 30:
        return 'Так'
    return 'Ні'


def _r_deep_check(wd, edges, ctx):
    if _is_sparkling(wd):
        return 'Так'
    t = _to_num(_resolve_param('style_sensory.tannins', wd))
    b = _to_num(_resolve_param('style_sensory.bitterness', wd))
    if t <= 30 and b <= 30:
        return 'Так'
    return 'Ні'


def _r_had_maceration(wd, edges, ctx):
    return 'Так' if ctx and ctx.get('had_maceration') else 'Ні'


def _r_ta_check(wd, edges, ctx):
    rm = wd.get('raw_material', {})
    ta_current = _to_num(rm.get('acidity', rm.get('ta_current')), 6.0)
    ta_target = _to_num(rm.get('ta_target', rm.get('targetAcidity')), 6.0)
    return 'Так' if ta_current < ta_target else 'Ні'


def _r_sugar_check(wd, edges, ctx):
    sp = wd.get('style_params', wd.get('style', {}))
    s0 = _to_num(sp.get('S0', sp.get('sugar')), 200)
    abv_target = _to_num(sp.get('alcoholTarget', 12), 12)
    rs = _to_num(sp.get('RS', 2), 2)
    needed = abv_target * 17 + rs
    return 'Так' if s0 >= needed else 'Ні'


def _r_yeast_color(wd, edges, ctx):
    if _is_sparkling(wd):
        return 'Ігристе'
    return _raw_color_label(wd)


def _r_yeast_white_sort(wd, edges, ctx):
    v = _get_variety(wd)
    if v in _AROMATIC_VARIETIES:
        return 'Muscat / Gewürztraminer / Riesling / Sauvignon Blanc'
    return 'Chardonnay / Pinot Gris / інший нейтральний білий'


def _r_yeast_red_sort(wd, edges, ctx):
    v = _get_variety(wd)
    if v in _RED_DELICATE_VARIETIES:
        return 'Pinot Noir / Gamay'
    if v in _RED_STRUCTURED_VARIETIES:
        return ('Cabernet Sauvignon / Merlot / Malbec / '
                'Nebbiolo / Syrah / Saperavi')
    return ('Grenache / Tempranillo / Sangiovese / '
            'Cabernet Franc / інший сорт')


def _r_sweetness_dry_notdry(wd, edges, ctx):
    cat = _sweetness_cat(wd)
    if cat in ('suhe', 'сухе', 'dry'):
        return 'Сухе'
    return 'Не сухе'


def _r_sweetness_subtype(wd, edges, ctx):
    cat = _sweetness_cat(wd)
    m = {
        'napivsuhe': 'Напівсухе', 'напівсухе': 'Напівсухе',
        'napivsolodke': 'Напівсолодке', 'напівсолодке': 'Напівсолодке',
        'desert': 'Солодке', 'солодке': 'Солодке', 'sweet': 'Солодке',
    }
    return m.get(cat, 'Напівсухе')


def _r_has_yeast_lees(wd, edges, ctx):
    val = str(wd.get('style_tech', {}).get('hasYeastLees', 'no')).lower()
    return 'Так' if val == 'yes' else 'Ні'


def _effective_yan_level(wd):
    """Return the effective YAN category, estimating from variety when unknown."""
    yl = str(wd.get('style_tech', {}).get('yanLevel', 'unknown')).lower()
    if yl in ('unknown', ''):
        estimated = _get_yan_estimate(wd)
        return _get_yan_category(estimated)
    return yl


def _r_yan_known(wd, edges, ctx):
    yl = _effective_yan_level(wd)
    return 'Так'


def _r_yan_low(wd, edges, ctx):
    yl = _effective_yan_level(wd)
    return 'Так' if yl == 'low' else 'Ні'


def _r_yan_mid(wd, edges, ctx):
    yl = _effective_yan_level(wd)
    return 'Так' if yl == 'normal' else 'Ні'


def _r_wine_type_still_sparkling(wd, edges, ctx):
    return 'Ігристе' if _is_sparkling(wd) else 'Тихе'


def _r_temp_color(wd, edges, ctx):
    if _is_sparkling(wd):
        return 'Ігристе'
    color = _get_color(wd)
    scheme = _get_scheme(wd)
    if scheme in ('blanc_de_noirs', 'Блан де нуар') or color == 'Blanc de Noir':
        return 'Блан де нуар'
    m = {
        'Біле': 'Біле', 'Рожеве': 'Рожеве', 'Червоне': 'Червоне',
        'Помаранчеве': 'Помаранчеве',
    }
    return m.get(color, 'Біле')


_ENGINE_RESOLVERS = {
    'grape_variety_known': _r_grape_variety_known,
    'grape_variety_white': _r_grape_variety_white,
    'grape_variety_orange': _r_grape_variety_orange,
    'grape_variety_red': _r_grape_variety_red,
    'grape_variety_bdn': _r_grape_variety_bdn,
    'stem_condition_known': _r_stem_condition_known,
    'raw_color': _r_raw_color,
    'fermentation_scheme_bw': _r_fermentation_scheme_bw,
    'fermentation_scheme_rc': _r_fermentation_scheme_rc,
    'skin_fermentation': _r_skin_fermentation,
    'is_sparkling': _r_is_sparkling,
    'angle_check': _r_angle_check,
    'deep_check': _r_deep_check,
    'had_maceration': _r_had_maceration,
    'ta_check': _r_ta_check,
    'sugar_check': _r_sugar_check,
    'yeast_color': _r_yeast_color,
    'yeast_white_sort': _r_yeast_white_sort,
    'yeast_red_sort': _r_yeast_red_sort,
    'sweetness_dry_notdry': _r_sweetness_dry_notdry,
    'sweetness_subtype': _r_sweetness_subtype,
    'has_yeast_lees': _r_has_yeast_lees,
    'yan_known': _r_yan_known,
    'yan_low': _r_yan_low,
    'yan_mid': _r_yan_mid,
    'wine_type_still_sparkling': _r_wine_type_still_sparkling,
    'temp_color': _r_temp_color,
}


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ROUTING_NODE_IDS = {
    'HUNGRY', 'WERE', 'CUTTING', 'NONE', 'GIRL',
    'SEMI_DRY', 'SEMI_SWEET', 'SWEET',
}

MACERATION_NODES = {
    'PORCH', 'CHEMICAL', 'AVERAGE', 'COMPANY', 'STRONG', 'THUMB', 'YET',
}


_STEM_BASE_IDS = {'SETTLE', 'APPROPRIATE'}
_STEM_REFINE_IDS = {'HEAVY', 'SHOOT', 'SUIT'}
_STEM_CORRECT_IDS = {'EVERYTHING', 'DISCOVER'}
_STEM_FINAL_ID = 'CHANGE'

_PCT_RANGE_RE = re.compile(r'(\d+)\s*[–\-]\s*(\d+)\s*%')
_PCT_SINGLE_RE = re.compile(r'(\d+)\s*%')


def _parse_pct_range(text):
    m = _PCT_RANGE_RE.search(text)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = _PCT_SINGLE_RE.search(text)
    if m:
        v = int(m.group(1))
        return v, v
    return None


def _compute_stem_limit(ctx):
    refine = ctx.get('stem_refinement')
    base = ctx.get('stem_base')
    correct = ctx.get('stem_correction')

    best = refine if refine else base
    if best is None:
        return '0%'

    if correct is not None and correct[1] < best[1]:
        best = correct

    if best[0] == best[1]:
        return f'{best[0]}%'
    return f'{best[0]}–{best[1]}%'


_MACERATION_LABEL_MAP = {'CHEMICAL', 'PURPLE', 'ANYWAY'}
_PRESSING_PRE_ID = 'SO'
_PRESSING_DETAIL_IDS = {'WORTH', 'FLOW'}

_RACK_SO2_NODE_IDS = {
    'RACK_W', 'RACK_W_EARLY', 'RACK_ROSE', 'RACK_RED', 'RACK_O',
    'NS_RACK_SD', 'NS_RACK_SS', 'NS_RACK_SWEET',
}

_SO2_LINE_RE = re.compile(r'SO2?\s*[\d\u2013\-]', re.IGNORECASE)
_SO2_NOBEZ_RE = re.compile(r'або без SO2?', re.IGNORECASE)

# AGE_W_LARGE label override: clarify vessel format, exhausted wood, fallback
_AGE_LABEL_OVERRIDES = {
    'AGE_W_LARGE': (
        'Витримка: великий дуб 500л+, б/в\n'
        'або акація\n'
        'τ = 4-8 місяців\n'
        'Якщо немає 500л+ — сталь або інертне'
    ),
}

# Batonnage node IDs that should be merged into the preceding aging step
_BAT_MERGE_IDS = {'BAT_W_FULL', 'BAT_W_LIGHT', 'BAT_W_NO', 'BAT_ROSE', 'BAT_O'}

_BAT_MERGE_SUFFIX = {
    'BAT_W_FULL':  'Батонаж: 1-2 рази/тиждень\nпротягом перших 2-6 місяців витримки',
    'BAT_W_LIGHT': 'Легкий батонаж: 1 раз/тиждень\nпротягом перших 1-2 місяців витримки',
    'BAT_W_NO':    'Без батонажу: редуктивна витримка\nзберегти тіоли',
    'BAT_ROSE':    'Без батонажу або мінімальний',
    'BAT_O':       'Батонаж: за бажанням\n1 раз/тиждень або рідше',
}


_CLAR_AGENT_NODE_IDS = {
    'CT_CLAR_BENT',
    'CLAR_W_BENT', 'CLAR_W_PVPP', 'CLAR_W_CAS',
    'CLAR_ROSE_BENT',
    'CLAR_RED_EGG', 'CLAR_RED_GEL', 'CLAR_RED_PVPP',
    'NS_CLAR_W', 'NS_CLAR_ROSE',
}

_CLAR_PROCESS_LABEL = {
    'CT_CLAR_BENT': 'Освітлення базового вина',
    'CLAR_W_BENT':  'Освітлення',
    'CLAR_W_PVPP':  'Освітлення',
    'CLAR_W_CAS':   'Освітлення',
    'CLAR_ROSE_BENT': 'Освітлення',
    'CLAR_RED_EGG': 'Освітлення',
    'CLAR_RED_GEL': 'Освітлення',
    'CLAR_RED_PVPP': 'Освітлення',
    'NS_CLAR_W':    'Освітлення + білкова стабілізація',
    'NS_CLAR_ROSE': 'Освітлення + білкова стабілізація',
}

_FINING_AGENT_NAME_RE = re.compile(
    r'^(?:бентоніт|pvpp|казеїн|активоване вугілля|яєчний білок|желатин)\s*:?\s*',
    re.IGNORECASE,
)


def _split_clar_label(node_id, clean):
    """Separate fining agent dosage from clarification step label.

    Returns (process_clean, agent_side) where agent_side is None when the node
    has no additive to extract.  agent_side starts with 'Препарат освітлення'
    so the frontend renders it as a side-input arrow from the left.
    """
    if node_id not in _CLAR_AGENT_NODE_IDS:
        return clean, None

    process = _CLAR_PROCESS_LABEL.get(node_id, 'Освітлення')
    lines = [l for l in clean.split('\n') if l.strip()]

    agent_parts = []
    for line in lines:
        stripped = line.rstrip(':').strip()
        # Skip the process name line
        if stripped.lower().startswith('освітлення'):
            continue
        # Strip leading agent name from the line; keep dosage/description
        cleaned = _FINING_AGENT_NAME_RE.sub('', line).strip().lstrip(':').strip()
        if cleaned:
            agent_parts.append(cleaned)
        # If the line was ONLY an agent name (e.g. "Бентоніт:") — skip silently

    if not agent_parts:
        return process, None

    agent_side = 'Препарат освітлення\n' + '\n'.join(agent_parts)
    return process, agent_side


def _consolidate_aging_batonnage(steps):
    """Merge batonnage steps into the preceding aging step.

    Batonnage is a sub-process performed on fine lees during aging (sur lies),
    not a sequential stage after it.  This function appends batonnage info to
    the aging step label and removes the standalone batonnage step so the
    frontend shows a single unified block.
    """
    result = []
    i = 0
    while i < len(steps):
        step = dict(steps[i])
        sid = step.get('id', '')

        if sid in _AGE_LABEL_OVERRIDES:
            override = _AGE_LABEL_OVERRIDES[sid]
            step['label_clean'] = override
            step['label'] = override

        if (i + 1 < len(steps) and steps[i + 1].get('id') in _BAT_MERGE_IDS):
            bat_id = steps[i + 1]['id']
            suffix = _BAT_MERGE_SUFFIX.get(bat_id, steps[i + 1].get('label_clean', ''))
            step['label_clean'] = step.get('label_clean', '') + '\n' + suffix
            step['label'] = step['label_clean']
            result.append(step)
            i += 2
            continue

        result.append(step)
        i += 1

    return result


def _split_rack_label(clean):
    """Separate SO₂ addition from a racking step label.

    Returns (rack_clean, so2_side) where so2_side is None when no SO₂ info
    is present.  so2_side starts with 'Препарат SO₂' so the frontend renders
    it as a side-input arrow coming in from the left.
    """
    lines = clean.split('\n')
    rack_lines = []
    so2_lines = []

    for line in lines:
        if _SO2_LINE_RE.search(line) or _SO2_NOBEZ_RE.search(line):
            normalized = re.sub(r'\s*вільного\s*$', '', line, flags=re.IGNORECASE).strip()
            normalized = re.sub(r'\bSO2\b', 'SO₂', normalized, flags=re.IGNORECASE)
            so2_lines.append(normalized)
        else:
            rack_lines.append(line)

    if not so2_lines:
        return clean, None

    so2_side = 'Препарат SO₂\n' + '\n'.join(so2_lines)
    rack_clean = '\n'.join(rack_lines)
    rack_clean = rack_clean.replace('Зняття з осаду', 'Зняття з грубого осаду')
    return rack_clean, so2_side


def _format_pressing(node_id, clean, wine_data):
    """Combine pressing steps into a single informative label."""
    if node_id == 'FLOW':
        return 'Пресування до бродіння\nне проводиться\n(червоне — бродіння на м\'язгі)'

    scheme = wine_data.get('color', {}).get('fermentation_scheme', 'white')
    lines = ['Пресування']
    if scheme in ('white', 'Біла', 'біла'):
        lines.append('пневматичний прес')
        lines.append('дбайливе пресування 0.2–1.5 бар')
        lines.append('фракціювання: самоплив + І прес')
    elif scheme in ('orange',):
        lines.append('пневматичний прес')
        lines.append('0.5–2.0 бар')
    else:
        lines.append('пневматичний прес')
        lines.append('0.2–1.5 бар')
    return '\n'.join(lines)


def _split_maceration_label(node_id, clean):
    """Reformat maceration step: prefix with 'Первинна мацерація',
    extract additions (pectinase etc.) as a separate side-input string."""
    lines = [l.strip() for l in clean.split('\n') if l.strip()]
    box_lines = []
    side_lines = []
    in_side = False
    for line in lines:
        low = line.lower()
        if ('пектиназа' in low or 'ензим' in low or 'фермент' in low):
            side_lines.append(line)
            in_side = True
        elif in_side and re.match(r'^[\d].*(?:г/гл|мг/л|мл/л)', line):
            side_lines.append(line)
        else:
            in_side = False
            if re.match(r'^[\d]', line) and '°' in line:
                box_lines.append('t = ' + line)
            elif re.match(r'^[\d]', line) and 'год' in line:
                box_lines.append('τ = ' + line)
            else:
                box_lines.append(line)

    box_lines.insert(0, 'Первинна мацерація')
    side = '\n'.join(side_lines) if side_lines else None
    return '\n'.join(box_lines), side


def _clean_label(label):
    """Convert mermaid label to readable text (strip <br/> etc)."""
    text = label.replace('<br>', '\n').replace('<br/>', '\n')
    text = text.replace('#40;', '(').replace('#41;', ')')
    text = text.replace('#60;', '<').replace('#62;', '>')
    text = text.replace('#39;', "'")
    text = text.strip()
    text = _rejoin_wrapped(text)
    text = _format_params(text)
    return text


_UNIT_END_RE = re.compile(
    r'(?:°C|год|хв|днів|тижн|місяц\S*|NTU|мг/л|г/гл|бар|%|мкм)\s*$')


_CONNECTORS_RE = re.compile(r'^(?:і|та|або|чи|\+)\s')
_PREP_END_RE = re.compile(r'\s(?:з|на|у|в|до|від|для|за|по|без)$')


def _rejoin_wrapped(text):
    """Re-join lines that were split purely for diagram width.

    Conservative: only join when continuation is obvious —
    single-word lowercase tail, line starting with a connector,
    or previous line ending with a preposition.
    """
    lines = text.split('\n')
    merged = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        prev_ok = (merged
                   and not _UNIT_END_RE.search(merged[-1])
                   and not merged[-1][-1].isdigit()
                   and not merged[-1].endswith(':'))
        if prev_ok and ' ' not in s and s[0].islower():
            merged[-1] += ' ' + s
        elif prev_ok and _CONNECTORS_RE.match(s):
            merged[-1] += ' ' + s
        elif merged and _PREP_END_RE.search(merged[-1]):
            merged[-1] += ' ' + s
        else:
            merged.append(s)
    # Join "цільова мутність" with following numeric line
    final = []
    skip_next = False
    for i, ln in enumerate(merged):
        if skip_next:
            skip_next = False
            continue
        if re.match(r'^цільова мутність$', ln, re.I) and i + 1 < len(merged):
            final.append('мутність = ' + merged[i + 1])
            skip_next = True
        else:
            final.append(ln)
    return '\n'.join(final)


_TEMP_RE = re.compile(r'^(-?\d[\d.,–\-]*\s*°C)\b(.*)')
_TIME_RE = re.compile(r'^(\d[\d.,–\-]*\s*(?:год|хв|днів|тижн|місяц)\S*)(.*)')
_PRESSURE_RE = re.compile(r'^(\d[\d.,–\-]*\s*бар\S*)(.*)')
_NTU_RE = re.compile(r'^(\d[\d.,–\-]*\s*NTU)(.*)')
_COOL_RE = re.compile(r'^охолодження\s+(-?\d[\d.,–\-]*\s*°C)')
_WORD_TEMP_RE = re.compile(
    r'^(?:температура|вода)\s+(-?\d[\d.,–\-]*\s*°C)\b(.*)')
_EMBEDDED_TIME_RE = re.compile(
    r'протягом\s+(\d[\d.,–\-]*\s*(?:год|хв|днів|тижн|місяц)\S*)')


def _format_params(text):
    """Prefix bare numeric values with parameter names and split compound lines."""
    lines = text.split('\n')
    result = []
    for line in lines:
        s = line.strip()
        if not s:
            continue

        if re.match(r'^цільова мутність$', s, re.I):
            continue

        m = re.match(r'^цільова мутність\s+(.*)$', s, re.I)
        if m:
            result.append('мутність = ' + m.group(1))
            continue

        m = _COOL_RE.match(s)
        if m:
            result.append('t = ' + m.group(1))
            continue

        m = _WORD_TEMP_RE.match(s)
        if m:
            result.append('t = ' + m.group(1))
            rest = m.group(2).strip()
            if rest:
                result.append(rest)
            continue

        m = _TEMP_RE.match(s)
        if m:
            result.append('t = ' + m.group(1))
            rest = m.group(2).strip()
            if rest:
                tm = _EMBEDDED_TIME_RE.search(rest)
                if tm:
                    result.append('τ = ' + tm.group(1))
                    rest = (rest[:tm.start()] + rest[tm.end():]).strip()
                if rest:
                    result.append(rest)
            continue

        m = _TIME_RE.match(s)
        if m:
            result.append('τ = ' + m.group(1))
            rest = m.group(2).strip()
            if rest:
                result.append(rest)
            continue

        m = _PRESSURE_RE.match(s)
        if m:
            result.append('P = ' + m.group(1))
            rest = m.group(2).strip()
            if rest:
                result.append(rest)
            continue

        m = _NTU_RE.match(s)
        if m:
            result.append('мутність = ' + m.group(1))
            rest = m.group(2).strip()
            if rest:
                result.append(rest)
            continue

        result.append(s)
    return '\n'.join(result)


_MLF_REF_RE = re.compile(
    r'\n?.*(?:після завершення МЛБ|після МЛБ|MLF).*', re.IGNORECASE)


def _is_real_mlf_step(label):
    """True if label describes an MLF step that IS actually performed."""
    low = label.lower()
    if 'млб' not in low:
        return False
    if _MLF_NO_RE.search(label):
        return False
    if 'після' in low:
        return False
    return True


def _clean_orphan_refs(steps):
    """Remove references to MLF from other steps when MLF itself was filtered."""
    has_mlf = any(_is_real_mlf_step(s.get('label_clean', '')) for s in steps)
    if has_mlf:
        return steps

    cleaned = []
    for s in steps:
        lc = s.get('label_clean', '')
        if 'після завершення млб' in lc.lower() or 'після млб' in lc.lower():
            new_lc = _MLF_REF_RE.sub('', lc).strip()
            if new_lc:
                cleaned.append({**s, 'label_clean': new_lc, 'label': new_lc})
            else:
                cleaned.append(s)
        else:
            cleaned.append(s)
    return cleaned


def get_technology_steps(wine_data):
    """Main entry: traverse decision tree and return ordered technology steps.

    Returns list of dicts:
      [{id, section, label, label_clean, type}, ...]
    """
    graph = get_graph()
    conditions_map = get_conditions_map()
    nodes = graph['nodes']
    adj = graph['adj']
    root = graph['root']

    steps = []
    visited = set()
    current = root
    ctx = {'had_maceration': False}
    max_iterations = 500

    for _ in range(max_iterations):
        if current is None or current in visited:
            break
        visited.add(current)

        node = nodes.get(current)
        if node is None:
            break

        if current in MACERATION_NODES:
            ctx['had_maceration'] = True

        outgoing = adj.get(current, [])

        if node['type'] == 'decision':
            if not outgoing:
                break
            chosen = _evaluate_condition(current, wine_data, conditions_map,
                                         outgoing, ctx)
            if chosen is None:
                break
            current = chosen['to']
            continue

        raw_label = node.get('label', current)
        clean = _clean_label(raw_label)
        is_routing = (raw_label == current) or (current in ROUTING_NODE_IDS)

        if current in _STEM_BASE_IDS:
            ctx['stem_base'] = _parse_pct_range(raw_label)
        elif current in _STEM_REFINE_IDS:
            ctx['stem_refinement'] = _parse_pct_range(raw_label)
        elif current in _STEM_CORRECT_IDS:
            pct = _parse_pct_range(raw_label)
            if pct:
                ctx['stem_correction'] = pct
        elif current == _STEM_FINAL_ID:
            clean = 'Фінальне обмеження = ' + _compute_stem_limit(ctx)

        if current == _PRESSING_PRE_ID:
            is_routing = True

        if current in _PRESSING_DETAIL_IDS:
            clean = _format_pressing(current, clean, wine_data)

        if current in _MACERATION_LABEL_MAP:
            clean, side = _split_maceration_label(current, clean)
            if side and not is_routing:
                steps.append({
                    'id': current + '_ADD',
                    'section': node.get('section'),
                    'label': side,
                    'label_clean': side,
                    'type': 'side_input',
                })

        if current in _RACK_SO2_NODE_IDS:
            clean, so2_side = _split_rack_label(clean)
            if so2_side and not is_routing:
                steps.append({
                    'id': current + '_SO2',
                    'section': node.get('section'),
                    'label': so2_side,
                    'label_clean': so2_side,
                    'type': 'side_input',
                })

        if current in _CLAR_AGENT_NODE_IDS:
            clean, clar_side = _split_clar_label(current, clean)
            if clar_side and not is_routing:
                steps.append({
                    'id': current + '_AGENT',
                    'section': node.get('section'),
                    'label': clar_side,
                    'label_clean': clar_side,
                    'type': 'side_input',
                })

        if not is_routing:
            steps.append({
                'id': current,
                'section': node.get('section'),
                'label': raw_label,
                'label_clean': clean,
                'type': node['type'],
            })

        if not outgoing:
            break

        if len(outgoing) == 1:
            current = outgoing[0]['to']
        else:
            chosen = _evaluate_condition(current, wine_data, conditions_map,
                                         outgoing, ctx)
            if chosen is None:
                break
            current = chosen['to']

    steps = _consolidate_correction(steps, wine_data)
    steps = _consolidate_fermentation(steps, wine_data)
    steps = _consolidate_aging_batonnage(steps)
    steps = [s for s in steps if not _is_not_applicable(s.get('label_clean', ''))]
    steps = _clean_orphan_refs(steps)
    return steps


# ---------------------------------------------------------------------------
# Post-processing: consolidate correction steps
# ---------------------------------------------------------------------------

_CORRECTION_IDS = {
    'TRAIN', 'MEASURE', 'POTATOES', 'SPECIFIC', 'TA_DOSE',
    'DOUBT', 'FIND', 'RUBBER', 'SAID', 'ME', 'FOREIGN',
}


def _consolidate_correction(steps, wine_data):
    """Replace individual correction steps with a single 'Корекція сусла' box
    plus side input arrows for tartaric acid and sugar when applicable."""
    first_idx = None
    last_idx = None
    correction_ids_found = set()

    for i, s in enumerate(steps):
        if s['id'] in _CORRECTION_IDS:
            if first_idx is None:
                first_idx = i
            last_idx = i
            correction_ids_found.add(s['id'])

    if first_idx is None:
        return steps

    needs_acid = 'DOUBT' in correction_ids_found
    needs_sugar = 'FOREIGN' in correction_ids_found or 'ME' in correction_ids_found

    sp = wine_data.get('style_params', wine_data.get('style', {}))
    rm = wine_data.get('raw_material', {})
    s0 = _to_num(sp.get('S0', sp.get('sugar')), 200)
    rs = _to_num(sp.get('RS', 2), 2)
    abv_target = _to_num(sp.get('alcoholTarget', 12), 12)
    sugar_needed = abv_target * 17 + rs
    sugar_to_add = max(0, sugar_needed - s0)

    ta_current = _to_num(rm.get('acidity', rm.get('ta_current')), 6.0)
    ta_target = _to_num(rm.get('ta_target', rm.get('targetAcidity')), 6.0)
    ph_current = _to_num(wine_data.get('style_tech', {}).get('pH'), 3.3)

    box_lines = ['Корекція сусла']
    if needs_sugar:
        box_lines.append(f'цукор = {sugar_to_add:.0f} г/дм³')
    else:
        box_lines.append('цукор не потрібен')
    if needs_acid:
        acid_dose_ta = max(0, ta_target - ta_current)
        acid_dose_ph = max(0, (ph_current - 3.5) / 0.1) if ph_current > 3.5 else 0
        dose = max(acid_dose_ta, acid_dose_ph)
        box_lines.append(f'винна кислота ≈ {dose:.1f} г/дм³')
    else:
        box_lines.append('кислотність в нормі')

    section = steps[first_idx].get('section')

    replacement = []

    if needs_acid:
        replacement.append({
            'id': 'CORR_ACID',
            'section': section,
            'label': 'Винна кислота',
            'label_clean': 'Винна кислота',
            'type': 'side_input',
        })

    if needs_sugar:
        replacement.append({
            'id': 'CORR_SUGAR',
            'section': section,
            'label': 'Цукор',
            'label_clean': 'Цукор',
            'type': 'side_input',
        })

    replacement.append({
        'id': 'CORR_MAIN',
        'section': section,
        'label': '\n'.join(box_lines),
        'label_clean': '\n'.join(box_lines),
        'type': 'action',
    })

    return steps[:first_idx] + replacement + steps[last_idx + 1:]


# ---------------------------------------------------------------------------
# Post-processing: consolidate fermentation steps
# ---------------------------------------------------------------------------

_AF_MERGE_REGIME = {'CLOSED', 'OPEN'}
_AF_MERGE_VESSEL_PREFIX = ('STEEL_', 'CLAY_')
_AF_MERGE_TEMP_PREFIX = 'TEMP_'
_AF_MERGE_PROF_PREFIX = 'PROF_'
_AF_REMOVE = {'EVIDENCE', 'CTRL_START', 'FINAL', 'POST_DONE',
              'DRY_CONTINUE', 'DRY_NOFEED',
              'SD_WAIT', 'SS_WAIT', 'SW_WAIT'}
_AF_YEAST_IDS_PREFIX = ('YEAST_', 'REHY_', 'INOC_')

_FERM_DURATION = {
    (10, 16): '14–21 днів',
    (16, 20): '10–14 днів',
    (20, 25): '7–10 днів',
    (25, 32): '5–10 днів',
}


def _guess_ferm_duration(temp_line):
    """Estimate fermentation duration from temperature."""
    if not temp_line:
        return '7–14 днів'
    m = re.search(r'(\d+)', temp_line)
    if not m:
        return '7–14 днів'
    t = int(m.group(1))
    for (lo, hi), dur in _FERM_DURATION.items():
        if lo <= t < hi:
            return dur
    return '7–14 днів'


def _extract_first_param(label_clean, skip_title=True):
    """Return first non-title line from a multi-line label."""
    lines = [l.strip() for l in label_clean.split('\n') if l.strip()]
    if skip_title and len(lines) > 1:
        return lines[1]
    return lines[0] if lines else ''


def _build_yeast_branch(steps, ids_to_remove):
    """Build a side branch for yeast preparation (2 boxes to the right)."""
    yeast_type = None
    activation_t = None
    activation_tau = None

    for s in steps:
        sid = s['id']
        lc = s['label_clean']

        if sid.startswith('YEAST_'):
            lines = [l.strip() for l in lc.split('\n') if l.strip()]
            for ln in lines:
                low = ln.lower()
                if low.startswith('дріжджі') or low.startswith('режим'):
                    continue
                if 'saccharomyces' in low or 'non-saccharomyces' in low:
                    continue
                if ln.strip():
                    yeast_type = ln.strip()
                    break
            ids_to_remove.add(sid)
        elif sid.startswith('REHY_'):
            for ln in lc.split('\n'):
                if 't =' in ln or '°C' in ln:
                    m = re.search(r't\s*=\s*(.+?)(?:\s*$)', ln)
                    if m:
                        activation_t = m.group(1).strip()
                if 'τ =' in ln or 'хв' in ln:
                    m = re.search(r'τ\s*=\s*(.+?)(?:\s*$)', ln)
                    if m:
                        activation_tau = m.group(1).strip()
            ids_to_remove.add(sid)
        elif sid.startswith('INOC_'):
            ids_to_remove.add(sid)

    if not yeast_type and not activation_t:
        return None

    box1_lines = ['Активація дріжджів:']
    if activation_t:
        box1_lines.append('t = ' + activation_t)
    if activation_tau:
        box1_lines.append('τ = ' + activation_tau)

    box2_lines = ['Активація дріжджів', 'з суслом:', 'τ = 15 хв']

    return {
        'id': 'YEAST_BRANCH',
        'section': None,
        'label': '',
        'label_clean': '',
        'type': 'side_branch',
        'branch': {
            'top_inputs': [
                'ЧКД:\n' + (yeast_type or 'S. cerevisiae'),
                'Вода\nпідготовлена 1:10',
            ],
            'box1': '\n'.join(box1_lines),
            'box2': '\n'.join(box2_lines),
            'must_label': 'Сусло 100 мл',
        },
    }


_NOT_APPLICABLE_RE = re.compile(
    r"не\s+(?:потрібн|застосов|проводит)|необов'язков|не\s+рекомендо",
    re.IGNORECASE)

_MLF_NO_RE = re.compile(r'МЛБ:\s*ні\b', re.IGNORECASE)


def _is_not_applicable(label):
    """Return True if label says the step is not needed / not applicable."""
    if _MLF_NO_RE.search(label):
        return True
    return bool(_NOT_APPLICABLE_RE.search(label))


_STOP_NODE_IDS = {'SD_STOP', 'SS_STOP', 'SW_STOP'}

_STOP_PARAMS = {
    'SD_STOP': {
        'name': 'Зупинка бродіння',
        'rs_label': 'напівсухе',
        'temp': '2–4°C',
        'time': 'τ = 24–48 год',
        'so2': 'SO₂ 30–50 мг/л',
        'extra': None,
    },
    'SS_STOP': {
        'name': 'Зупинка бродіння',
        'rs_label': 'напівсолодке',
        'temp': '0–2°C',
        'time': 'τ = 24–48 год',
        'so2': 'SO₂ 40–60 мг/л',
        'extra': 'стерильна фільтрація',
    },
    'SW_STOP': {
        'name': 'Зупинка бродіння',
        'rs_label': 'солодке',
        'temp': '0°C',
        'time': 'τ = 48–72 год',
        'so2': 'SO₂ 50–70 мг/л',
        'extra': 'стерильна фільтрація',
    },
}


def _calc_mu_from_rs(rs_g_l):
    """Approximate specific gravity (μ) from residual sugar (g/L).
    At end of fermentation with alcohol present:
    μ ≈ 0.994 + RS × 0.00038
    """
    return round(0.994 + rs_g_l * 0.00038, 3)


def _format_stop_step(step, wine_data):
    """Format a fermentation stop step with μ, temperature, time."""
    sid = step['id']
    params = _STOP_PARAMS.get(sid)
    if not params:
        return step

    rs_target = None
    if wine_data:
        rs_target = _to_num(
            wine_data.get('style_params', {}).get('RS'), None)

    lines = [params['name']]

    if rs_target is not None:
        mu = _calc_mu_from_rs(rs_target)
        lines.append(f'μ = {mu:.3f} (RS = {rs_target:.0f} г/л)')
    else:
        lines.append(f'при досягненні цільового RS ({params["rs_label"]})')

    lines.append(f't = {params["temp"]}')
    lines.append(params['time'])
    lines.append(params['so2'])
    if params['extra']:
        lines.append(params['extra'])

    label = '\n'.join(lines)
    return {**step, 'label_clean': label, 'label': label}


def _is_feed_step(step):
    """Detect feed/nutrient steps by ID or label content."""
    sid = step.get('id', '')
    if 'FEED' in sid:
        return True
    lc = step.get('label_clean', '')
    return lc.lower().startswith('підкормка')


def _consolidate_fermentation(steps, wine_data=None):
    """Merge regime, vessel, temp, profile into the AF box;
    consolidate yeast steps; remove EVIDENCE."""
    af_idx = None
    for i, s in enumerate(steps):
        if s['id'] == 'AF':
            af_idx = i
            break

    if af_idx is None:
        return [s for s in steps if s['id'] not in _AF_REMOVE]

    regime_line = None
    vessel_line = None
    temp_line = None
    prof_line = None
    ids_to_remove = set(_AF_REMOVE)

    for s in steps:
        sid = s['id']
        lc = s['label_clean']

        if sid in _AF_MERGE_REGIME:
            regime_line = _extract_first_param(lc)
            ids_to_remove.add(sid)
        elif any(sid.startswith(p) for p in _AF_MERGE_VESSEL_PREFIX):
            vessel_line = _extract_first_param(lc)
            ids_to_remove.add(sid)
        elif sid.startswith(_AF_MERGE_TEMP_PREFIX):
            for ln in lc.split('\n'):
                if 't =' in ln or '°C' in ln:
                    temp_line = ln.strip()
                    break
            ids_to_remove.add(sid)
        elif sid.startswith(_AF_MERGE_PROF_PREFIX):
            first = _extract_first_param(lc, skip_title=False)
            if first.lower().startswith('профіль:'):
                prof_line = first
            else:
                prof_line = 'Профіль: ' + first
            ids_to_remove.add(sid)

    ferm_duration = _guess_ferm_duration(temp_line)

    yeast_step = _build_yeast_branch(steps, ids_to_remove)

    is_dry = False
    if wine_data:
        is_dry = _sweetness_cat(wine_data) in ('suhe', 'сухе', 'dry')

    box_lines = ['Первинне бродіння']
    if regime_line:
        box_lines.append('Режим: ' + regime_line)
    if vessel_line:
        box_lines.append('Посуд: ' + vessel_line)
    if temp_line:
        box_lines.append(temp_line)
    box_lines.append('τ = ' + ferm_duration)
    if prof_line:
        box_lines.append(prof_line)
    if is_dry:
        box_lines.append('Зупинка: при μ = 0.996–1.000')

    feed_side = None
    calc_label = None
    no_feed_needed = False
    if wine_data:
        rec = calculate_feed_recommendation(wine_data)
        if rec['deficit_mg_l'] > 0 and rec['label']:
            calc_label = rec['label']
        elif rec['deficit_mg_l'] <= 0:
            no_feed_needed = True

    for s in steps:
        if _is_feed_step(s):
            if no_feed_needed:
                pass
            elif calc_label:
                feed_side = {
                    **s,
                    'label_clean': calc_label,
                    'label': calc_label,
                    'type': 'side_input',
                }
            else:
                compact = _compact_feed(s['label_clean'])
                if not _is_not_applicable(compact):
                    feed_side = {
                        **s,
                        'label_clean': compact,
                        'label': compact,
                        'type': 'side_input',
                    }
            ids_to_remove.add(s['id'])

    result = []
    for s in steps:
        if s['id'] in ids_to_remove:
            continue
        if _is_not_applicable(s.get('label_clean', '')):
            continue
        if s['id'] == 'AF':
            if feed_side:
                result.append(feed_side)
            if yeast_step:
                result.append(yeast_step)
            result.append({
                **s,
                'label_clean': '\n'.join(box_lines),
                'label': '\n'.join(box_lines),
            })
        elif s['id'] in _STOP_NODE_IDS:
            formatted = _format_stop_step(s, wine_data)
            result.append(formatted)
        else:
            result.append(s)
    return result


_DOSAGE_RE = re.compile(r'(\d[\d.,–\-]*\s*(?:г/гл|мг/л|мл/л))')


def _compact_feed(label_clean):
    """Condense feed step into a short label suitable for a side arrow."""
    low = label_clean.lower()
    if 'не потрібна' in low or 'не проводиться' in low:
        m = _DOSAGE_RE.search(label_clean)
        if m:
            return 'Підкормка\n' + m.group(1) + ' (за стресу)'
        return 'Підкормка\nне потрібна'

    text = low
    result = ['Підкормка:']

    primary_dose = None
    if 'дріжджовий осад' in text or 'інактивовані дріжджі' in text:
        after = text.split('дріжджовий осад')[-1] if 'дріжджовий осад' in text else text.split('інактивовані дріжджі')[-1]
        m = _DOSAGE_RE.search(after.split('комплексн')[0] if 'комплексн' in after else after)
        if m:
            primary_dose = m.group(1)

    if 'дріжджовий осад' in text and 'інактивовані' in text:
        result.append('др. осад / інакт. дріжджі ' + (primary_dose or ''))
    elif 'дріжджовий осад' in text:
        result.append('др. осад ' + (primary_dose or ''))
    elif 'інактивовані дріжджі' in text:
        result.append('інакт. дріжджі ' + (primary_dose or ''))

    if 'комплексна підкормка' in text or 'комплексн' in text:
        after_complex = text.split('комплексн')[-1]
        if 'без комплексн' in text:
            cm = _DOSAGE_RE.search(after_complex)
            if cm:
                result.append('компл. підк. до ' + cm.group(1) + ' (за стресу)')
        else:
            cm = _DOSAGE_RE.search(after_complex)
            if cm:
                result.append('компл. підк. ' + cm.group(1))

    if len(result) == 1:
        doses = _DOSAGE_RE.findall(label_clean)
        if doses:
            result.append(doses[0])

    return '\n'.join(result).strip()


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    g = parse_mermaid()
    print(f"Nodes: {len(g['nodes'])}")
    print(f"Edges: {len(g['edges'])}")
    print(f"Root:  {g['root']}")
    print(f"Decision nodes: "
          f"{sum(1 for n in g['nodes'].values() if n['type'] == 'decision')}")
    print(f"Action nodes: "
          f"{sum(1 for n in g['nodes'].values() if n['type'] == 'action')}")
    print()

    test_wine = {
        'color': {
            'color': 'Біле',
            'fermentation_scheme': 'white',
            'grapeVariety': 'chardonnay',
            'grapeCondition': 'healthy',
            'stemCondition': 'unknown',
        },
        'style_params': {
            'sweetnessCategory': 'suhe',
            'S0': 200,
            'RS': 2,
            'style': 'Сухе',
        },
        'style_co2': {'co2Type': 'still'},
        'style_sensory': {
            'aromaIntensity': 50, 'thiolTerpene': 30,
            'tannins': 20, 'body': 55, 'oxidation': 40,
            'malolactic': 50, 'creaminess': 45, 'bitterness': 20,
        },
        'style_tech': {
            'pH': 3.3, 'microRisk': 30, 'yanLevel': 'normal',
        },
        'raw_material': {'acidity': 6.5, 'ta_target': 6.0},
    }

    print("=== Test: White dry Chardonnay ===")
    steps = get_technology_steps(test_wine)
    print(f"Total steps: {len(steps)}")
    for i, s in enumerate(steps, 1):
        lines = s['label_clean'].split('\n')
        print(f"  {i:2d}. [{s['id']}] {lines[0]}")
        for line in lines[1:]:
            print(f"      {line}")
    print()

    test_red = {
        'color': {
            'color': 'Червоне',
            'fermentation_scheme': 'red',
            'grapeVariety': 'cabernet sauvignon',
            'grapeCondition': 'healthy',
        },
        'style_params': {
            'sweetnessCategory': 'suhe', 'S0': 220, 'RS': 2,
        },
        'style_co2': {'co2Type': 'still'},
        'style_sensory': {
            'aromaIntensity': 40, 'thiolTerpene': 20,
            'tannins': 70, 'body': 65, 'oxidation': 30,
            'malolactic': 60, 'creaminess': 30, 'bitterness': 30,
        },
        'style_tech': {
            'pH': 3.5, 'microRisk': 35, 'yanLevel': 'low',
        },
        'raw_material': {'acidity': 5.5, 'ta_target': 6.0},
    }

    print("=== Test: Red dry Cabernet Sauvignon (YAN low) ===")
    steps = get_technology_steps(test_red)
    print(f"Total steps: {len(steps)}")
    for i, s in enumerate(steps, 1):
        lines = s['label_clean'].split('\n')
        print(f"  {i:2d}. [{s['id']}] ({s.get('type','')}) {lines[0]}")
        for line in lines[1:]:
            print(f"      {line}")
    print()

    print("=== Nitrogen calculation tests ===")
    scenarios = [
        ('Chardonnay white dry, YAN unknown',
         {**test_wine, 'style_tech': {'pH': 3.3, 'yanLevel': 'unknown'}}),
        ('Riesling white dry aromatic, YAN unknown',
         {**test_wine,
          'color': {**test_wine['color'], 'grapeVariety': 'riesling'},
          'style_tech': {'pH': 3.3, 'yanLevel': 'unknown'}}),
        ('Cab Sauv red dry, YAN unknown, has lees',
         {**test_red,
          'style_tech': {'pH': 3.5, 'yanLevel': 'unknown',
                         'hasYeastLees': 'yes'}}),
        ('Cab Sauv red dry, YAN low, no lees',
         {**test_red,
          'style_tech': {'pH': 3.5, 'yanLevel': 'low',
                         'hasYeastLees': 'no'}}),
        ('Pinot Noir red dry, YAN high, no lees',
         {**test_red,
          'color': {**test_red['color'], 'grapeVariety': 'pinot noir'},
          'style_tech': {'pH': 3.5, 'yanLevel': 'high',
                         'hasYeastLees': 'no'}}),
    ]
    for name, wd in scenarios:
        rec = calculate_feed_recommendation(wd)
        print(f"\n  {name}:")
        print(f"    YAN natural = {rec['yan_natural']} mg/L "
              f"(cat: {rec['yan_category']})")
        print(f"    YAN target  = {rec['yan_target']} mg/L")
        print(f"    Deficit     = {rec['deficit_mg_l']} mg/L")
        print(f"    Lees: {'yes' if rec['has_lees'] else 'no'}, "
              f"dose = {rec['lees_dose_g_dal']} g/dal")
        print(f"    Complex: {rec['complex_dose_g_dal']} g/dal, "
              f"N eff = {rec['complex_n_effective_mg_l']} mg/L")
        print(f"    Label: {rec['label']}")
