// Miniguias de demonstração: criadores, lugares e roteiros fictícios.
const g = (id, name, note, by, handle, avatar, photo, city, count, color, featured = true) => ({ id, name, note, by, handle, avatar, photo, city, count, color, featured, href: '/@demo/roteiros/' + (((id - 1) % 3) + 1) })
export const DEMO_GUIDES = [
  g(1, 'Liberdade a pé', 'Uma tarde no bairro, do izakaya ao ramen, sem pegar o carro.', 'Mapa de demonstração', 'mapa_demo', null, 'ramen', 'São Paulo', 2, '#FF4B2B'),
  g(2, 'Cafés para ficar mais um pouco', 'Três cafés, três jeitos de passar o sábado.', 'Duda & Lu', 'dudaelu.cafe.demo', 'duda-lu', 'latte', 'São Paulo', 3, '#EC4899'),
  g(3, 'Uma noite, quatro bairros', 'Da primeira rodada no centro à tapioca da madrugada.', 'Bia & Caio', 'biaecaio.come.demo', 'bia-caio', 'drink', 'São Paulo', 4, '#2D7FF9'),
  g(4, 'Jantar sozinho, sem pressa', 'Balcões onde uma mesa para um é a melhor da casa.', 'Rafa à Mesa', 'rafaamesa.demo', 'rafa', 'ostras', 'São Paulo', 3, '#8B5CF6'),
  g(5, 'Um dia de praia e petisco', 'Café na orla, almoço demorado e sorvete no fim da tarde.', 'Bia & Caio', 'biaecaio.come.demo', 'bia-caio', 'sorvete', 'Santos', 3, '#36C5A0'),
  g(6, 'Doces de fim de semana', 'Confeitarias que valem a viagem até o interior.', 'Duda & Lu', 'dudaelu.cafe.demo', 'duda-lu', 'confeitaria', 'Campinas', 2, '#FFC400'),
  g(7, 'Pastel e feira de domingo', 'Barracas, caldo de cana e o que levar para casa.', 'Bia & Caio', 'biaecaio.come.demo', 'bia-caio', 'pastel', 'São Paulo', 3, '#FF4B2B', false),
]
