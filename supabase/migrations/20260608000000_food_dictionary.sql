-- AnimalMind - Dicionário de Alimentos Seguros/Tóxicos
-- Criar tabela foods

CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}'::TEXT[],
  safe_for TEXT[] DEFAULT '{}'::TEXT[],
  dangerous_for TEXT[] DEFAULT '{}'::TEXT[],
  toxic_for TEXT[] DEFAULT '{}'::TEXT[],
  severity TEXT NOT NULL CHECK (severity IN ('safe', 'caution', 'dangerous', 'toxic')),
  reason TEXT NOT NULL,
  symptoms TEXT[] DEFAULT '{}'::TEXT[],
  what_to_do TEXT,
  sources TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Allow public read access" ON public.foods;
CREATE POLICY "Allow public read access" ON public.foods
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access" ON public.foods;
CREATE POLICY "Allow admin write access" ON public.foods
  FOR ALL TO authenticated
  USING (
    COALESCE(private.current_app_user_role() = 'admin', FALSE)
  )
  WITH CHECK (
    COALESCE(private.current_app_user_role() = 'admin', FALSE)
  );

-- Permissões
GRANT SELECT ON public.foods TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.foods TO authenticated, service_role;

-- Seed data: 30 alimentos comuns em português com dados clínicos reais
INSERT INTO public.foods (name, aliases, safe_for, dangerous_for, toxic_for, severity, reason, symptoms, what_to_do, sources)
VALUES
  (
    'Uva',
    ARRAY['grape', 'uvas', 'passa', 'raisin'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    'toxic',
    'Altamente tóxica mesmo em pequenas quantidades. Pode causar falha renal aguda súbita em cães e gatos.',
    ARRAY['Vómitos', 'Diarreia', 'Letargia', 'Perda de apetite', 'Dor abdominal', 'Diminuição da urina'],
    'Contacte o veterinário imediatamente para indução do vómito se ingerido recentemente. Não espere pelos sintomas.',
    ARRAY['ASPCA Animal Poison Control', 'Veterinary Partner']
  ),
  (
    'Uva Passa',
    ARRAY['passas', 'raisin', 'raisins', 'grape', 'grapes'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    'toxic',
    'Versão desidratada da uva. A toxicidade é ainda mais concentrada, levando à insuficiência renal severa.',
    ARRAY['Vómitos', 'Fraqueza', 'Anúria (ausência de urina)', 'Desidratação', 'Letargia'],
    'Procure assistência veterinária de emergência. A indução do vómito e fluidoterapia imediata são cruciais.',
    ARRAY['Pet Poison Helpline']
  ),
  (
    'Chocolate',
    ARRAY['cacau', 'chocolate preto', 'chocolate de culinária', 'chocolate de leite', 'bombom', 'chocolate em pó'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat', 'bird', 'rabbit']::TEXT[],
    'toxic',
    'Contém teobromina e cafeína, metilxantinas que o organismo dos animais não consegue processar de forma segura.',
    ARRAY['Hiperatividade', 'Vómitos', 'Diarreia', 'Batimento cardíaco acelerado', 'Tremores', 'Convulsões'],
    'Calcule a quantidade ingerida e a percentagem de cacau e corra para o hospital veterinário.',
    ARRAY['MSD Veterinary Manual']
  ),
  (
    'Cebola',
    ARRAY['onion', 'cebolas', 'cebolinho', 'cebola em pó'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    'toxic',
    'Contém sulfóxidos e dissulfetos que destroem os glóbulos vermelhos, provocando anemia hemolítica (anemia de Heinz).',
    ARRAY['Fraqueza', 'Gengivas pálidas', 'Urina escura ou avermelhada', 'Letargia', 'Vómitos'],
    'Leve ao veterinário para avaliação de hemograma de controlo e suporte de oxigénio se necessário.',
    ARRAY['ASPCA']
  ),
  (
    'Alho',
    ARRAY['garlic', 'alho em pó', 'alho cozido'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    'toxic',
    'Pertence à mesma família Allium da cebola, mas é cerca de 5 vezes mais potente e tóxico por grama.',
    ARRAY['Anemia', 'Letargia', 'Ritmo cardíaco elevado', 'Falta de ar', 'Descoloração das gengivas'],
    'Evite dar qualquer sobra de comida temperada com alho. Contacte a clínica de imediato se ingerido em grande quantidade.',
    ARRAY['ASPCA']
  ),
  (
    'Xilitol',
    ARRAY['xylitol', 'adoçante', 'chiclete sem açúcar', 'pasta de dentes'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog']::TEXT[],
    'toxic',
    'Causa uma libertação massiva de insulina em cães, resultando numa hipoglicémia severa e falência hepática.',
    ARRAY['Vómitos', 'Perda de coordenação', 'Letargia', 'Tremores', 'Convulsões', 'Coma'],
    'Emergência crítica. Ofereça água com açúcar ou mel nas gengivas a caminho do veterinário.',
    ARRAY['FDA Pet Safety']
  ),
  (
    'Noz de Macadâmia',
    ARRAY['macadamia', 'macadamias', 'nozes de macadamia'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog']::TEXT[],
    'toxic',
    'Afeta o sistema nervoso e muscular dos cães. O mecanismo exato de toxicidade é desconhecido, mas os efeitos são severos.',
    ARRAY['Fraqueza nas patas traseiras', 'Depressão', 'Vómitos', 'Tremores', 'Hipertermia'],
    'Leve ao veterinário para tratamento de suporte com fluidoterapia e monitorização.',
    ARRAY['ASPCA']
  ),
  (
    'Abacate',
    ARRAY['avocado', 'palta', 'caroço de abacate'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY['bird', 'rabbit']::TEXT[],
    'toxic',
    'Contém persina, uma toxina fungicida. Altamente tóxico para aves e coelhos, causando congestão pulmonar rápida.',
    ARRAY['Dificuldade respiratória', 'Acumulação de fluido no coração e pulmões', 'Morte súbita'],
    'Não ofereça abacate de todo. Aves e coelhos expostos devem ser tratados como emergência absoluta.',
    ARRAY['ASPCA']
  ),
  (
    'Cafeína',
    ARRAY['cafeina', 'café', 'chá preto', 'chá verde', 'bebida energética', 'grãos de café'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat', 'bird']::TEXT[],
    'toxic',
    'Estimulante do sistema nervoso central e cardíaco. Os animais são muito sensíveis à cafeína e doses baixas podem ser fatais.',
    ARRAY['Inquietação', 'Hiperatividade', 'Vómitos', 'Taquicardia', 'Tremores', 'Convulsões'],
    'Leve ao veterinário de imediato. A indução rápida de vómito e administração de carvão ativado são fundamentais.',
    ARRAY['Pet Poison Helpline']
  ),
  (
    'Álcool',
    ARRAY['alcohol', 'cerveja', 'vinho', 'licor', 'bebidas alcoólicas', 'etanol'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat', 'bird', 'rabbit']::TEXT[],
    'toxic',
    'Provoca intoxicação rápida por etanol, levando a acidose metabólica severa, hipotermia e paragem respiratória.',
    ARRAY['Vómitos', 'Descoordenação', 'Depressão do sistema nervoso', 'Dificuldade respiratória', 'Coma'],
    'Contacte o veterinário imediatamente. Requer monitorização constante e fluidoterapia intravenosa.',
    ARRAY['Veterinary Partner']
  ),
  (
    'Ossos Cozidos',
    ARRAY['osso cozido', 'ossos de frango', 'ossos de porco', 'ossos de vaca'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'Ao contrário de ossos crus, os ossos cozidos tornam-se quebradiços e podem lascar ao mastigar, perfurando o estômago ou intestinos.',
    ARRAY['Engasgamento', 'Vómitos com sangue', 'Dificuldade em defecar', 'Dor abdominal', 'Letargia'],
    'Não tente induzir o vómito para evitar cortes secundários no esófago. Leve imediatamente ao veterinário para exames de imagem.',
    ARRAY['RSPCA']
  ),
  (
    'Sal em Excesso',
    ARRAY['sal', 'sódio', 'sodium', 'batatas fritas', 'snacks salgados'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat', 'bird']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'Grandes quantidades de sódio podem provocar desidratação extrema e intoxicação por iões de sódio, afetando os rins.',
    ARRAY['Sede excessiva', 'Vómitos', 'Diarreia', 'Tremores', 'Temperatura corporal elevada', 'Convulsões'],
    'Mantenha sempre água fresca disponível. Se consumido em massa, consulte o veterinário de emergência.',
    ARRAY['ASPCA']
  ),
  (
    'Leite',
    ARRAY['milk', 'iogurte', 'queijo', 'lactose', 'laticínios'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'A maioria dos cães e gatos adultos é intolerante à lactose, não possuindo a enzima lactase para fazer a correta digestão.',
    ARRAY['Diarreia', 'Gases', 'Desconforto abdominal', 'Vómitos'],
    'Evite lacticínios normais. Opte por leite ou iogurte natural sem lactose ou queijo magro em porções mínimas.',
    ARRAY['Cornell University Vet']
  ),
  (
    'Massa de Pão Crua',
    ARRAY['fermento', 'massa levedada', 'massa crua'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'O fermento expande-se no estômago quente do animal, provocando distensão gástrica severa. Também liberta álcool (etanol) no sangue.',
    ARRAY['Inchaço abdominal', 'Tentativas de vómito sem sucesso', 'Dor severa', 'Fraqueza'],
    'Emergência crítica. Pode requerer lavagem gástrica ou cirurgia de descompressão estomacal imediata.',
    ARRAY['ASPCA']
  ),
  (
    'Noz-moscada',
    ARRAY['nutmeg', 'noz moscada'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'Contém miristicina, um composto com propriedades alucinogénias e tóxicas para cães e gatos em doses significativas.',
    ARRAY['Alucinações', 'Descoordenação', 'Aumento do ritmo cardíaco', 'Boca seca', 'Convulsões'],
    'Contacte o veterinário se o animal ingeriu uma dose considerável de especiarias ou misturas de culinária.',
    ARRAY['Pet Poison Helpline']
  ),
  (
    'Caroços de Fruta',
    ARRAY['caroços', 'caroço de pêssego', 'sementes de maçã', 'caroço de ameixa'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'Podem causar obstrução intestinal física e asfixia. Adicionalmente, contêm amigdalina, que se converte em cianeto se mastigado.',
    ARRAY['Vómitos', 'Dor abdominal', 'Dificuldade respiratória', 'Gengivas vermelhas brilhantes', 'Pupilas dilatadas'],
    'Monitore o cão/gato para sinais de asfixia ou obstrução intestinal. Consulte o veterinário se engolido por inteiro.',
    ARRAY['Veterinary Medicine Journal']
  ),
  (
    'Batata Crua',
    ARRAY['batata verde', 'casca de batata', 'solanina'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'Batatas cruas e as suas partes verdes contêm solanina, um alcaloide tóxico. O processo de cozedura destrói a solanina.',
    ARRAY['Vómitos', 'Diarreia', 'Letargia', 'Desorientação', 'Fraqueza cardíaca'],
    'Ofereça apenas batata cozida e descascada. Contacte o veterinário se o animal ingeriu batatas verdes cruas.',
    ARRAY['RSPCA']
  ),
  (
    'Tomate Verde',
    ARRAY['tomateiro', 'folha de tomate', 'solanina', 'tomatina'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'As partes verdes do tomateiro e os tomates não maduros contêm solanina e tomatina, prejudiciais ao sistema digestivo dos animais.',
    ARRAY['Babeira excessiva', 'Perda de apetite', 'Gastroenterite severa', 'Letargia', 'Fraqueza'],
    'Mantenha o cão/gato longe da horta de tomates. Tomates maduros vermelhos são seguros em moderação.',
    ARRAY['ASPCA']
  ),
  (
    'Cogumelos Silvestres',
    ARRAY['cogumelos de jardim', 'fungos', 'amanita'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'Muitos cogumelos silvestres de jardim são extremamente tóxicos e podem causar falência hepática ou renal rápida no animal.',
    ARRAY['Vómitos', 'Diarreia', 'Babeira', 'Tremores', 'Alucinações', 'Falência hepática'],
    'Recolha uma amostra do cogumelo (usando luvas) e leve o animal imediatamente ao veterinário de urgência.',
    ARRAY['North American Mycological Association']
  ),
  (
    'Bicarbonato e Fermento',
    ARRAY['fermento em pó', 'bicarbonato de sódio', 'fermento químico'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'Ingerir fermento químico ou bicarbonato em grande quantidade provoca graves desequilíbrios eletrolíticos e espasmos.',
    ARRAY['Espasmos musculares', 'Insuficiência cardíaca', 'Inchaço', 'Dor abdominal'],
    'Mantenha os ingredientes de pastelaria guardados de forma segura. Contacte a clínica se ingerido.',
    ARRAY['ASPCA']
  ),
  (
    'Cenoura',
    ARRAY['carrot', 'cenouras'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Excelente snack de baixas calorias, rico em fibras e beta-caroteno. Muito útil para mastigação e saúde oral em cães.',
    ARRAY[]::TEXT[],
    'Pode servir crua ou cozida. Corte sempre em pedaços pequenos ou tiras para evitar engasgamentos.',
    ARRAY['AKC', 'VetStreet']
  ),
  (
    'Maçã (sem sementes)',
    ARRAY['apple', 'maçã', 'maca'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Rica em vitaminas A e C e fibras. Funciona como uma excelente recompensa refrescante. Remova sempre todas as sementes e o caroço.',
    ARRAY[]::TEXT[],
    'Sirva fatias limpas. Não ofereça o caroço central pois as sementes contêm precursores de cianeto.',
    ARRAY['AKC']
  ),
  (
    'Frango Cozido',
    ARRAY['chicken', 'peito de frango', 'carne de frango'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Excelente fonte de proteína magra. Ideal para alimentação diária ou dietas moles quando o estômago do cão ou gato está sensível.',
    ARRAY[]::TEXT[],
    'Cozinhe apenas em água simples, sem adicionar sal, cebola, alho ou especiarias. Remova todos os ossos.',
    ARRAY['AKC', 'Veterinary Partner']
  ),
  (
    'Arroz Branco Cozido',
    ARRAY['rice', 'arroz cozido', 'arroz simples'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Fácil de digerir, ajuda a firmar as fezes durante episódios de indisposição gastrointestinal ligeira.',
    ARRAY[]::TEXT[],
    'Sirva o arroz cozido apenas em água pura, sem adição de óleos, manteiga, sal ou temperos.',
    ARRAY['AKC']
  ),
  (
    'Abóbora',
    ARRAY['pumpkin', 'abóbora cozida', 'abobora'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Excelente fonte de fibra solúvel, regulando eficazmente o trânsito intestinal em situações de diarreia ou obstipação.',
    ARRAY[]::TEXT[],
    'Sirva cozida e esmagada (puré), sem açúcar ou sal. Não utilize misturas de abóbora enlatadas doces.',
    ARRAY['UC Davis Vet Medicine']
  ),
  (
    'Banana',
    ARRAY['banana', 'bananas'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Rica em potássio, vitaminas, biotina e fibras. Devido ao alto teor de açúcares naturais, deve ser dada de forma moderada.',
    ARRAY[]::TEXT[],
    'Ofereça fatias pequenas ocasionalmente como um prémio especial.',
    ARRAY['AKC']
  ),
  (
    'Melancia (sem sementes)',
    ARRAY['watermelon', 'melancia sem sementes'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Composta por 92% de água, é ótima para hidratação no verão. Contém vitaminas essenciais A, B6 e C.',
    ARRAY[]::TEXT[],
    'Remova totalmente a casca verde exterior dura e todas as sementes pretas antes de dar ao seu animal.',
    ARRAY['AKC']
  ),
  (
    'Brócolos',
    ARRAY['broccoli', 'brócolis'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Ricos em vitamina C e fibras. Podem ser servidos cozidos a vapor ou crus em pequenas quantidades.',
    ARRAY[]::TEXT[],
    'Corte as flores em pedaços e dê em moderação, pois os brócolos podem causar gases intestinais.',
    ARRAY['Vetstreet']
  ),
  (
    'Batata-doce Cozida',
    ARRAY['sweet potato', 'batata doce'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Excelente fonte de fibra dietética, vitamina A, B6 e C. Muito benéfica para a digestão do cão e do gato.',
    ARRAY[]::TEXT[],
    'Nunca dê batata-doce crua. Cozinhe sempre muito bem (cozida ou assada) e retire a casca.',
    ARRAY['AKC']
  ),
  (
    'Feijão-verde',
    ARRAY['green beans', 'feijão verde', 'feijao verde'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Rico em ferro, cálcio e vitaminas. Baixo teor calórico, ideal como petisco saudável para cães em regime de controlo de peso.',
    ARRAY[]::TEXT[],
    'Sirva cozidos em água simples ou crus cortados, livres de sal ou cebola.',
    ARRAY['AKC']
  );
