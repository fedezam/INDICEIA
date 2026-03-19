export function mapCognition(permissions = {}, domain) {
  return {
    enabled: Object.keys(permissions).filter(
      (k) => permissions[k]?.enabled
    ),
    domain
  };
}
