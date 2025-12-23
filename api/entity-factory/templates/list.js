import registry from './registry.json';

export default function handler(req, res) {
  res.status(200).json(registry);
}
