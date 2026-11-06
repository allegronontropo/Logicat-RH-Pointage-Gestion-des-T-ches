## HTTP status conventions
- 401 = missing/invalid/expired token, OR inactive account
- 403 = valid token but wrong role, OR not resource owner
- 404 = resource doesn't exist
- 409 = business-rule conflict (double check-in, checkout during break, last-admin, etc.)
- 422 = validation error (Pydantic)

## Identity rule
For employee endpoints, identity comes from the JWT — never from a path/query employee_id.