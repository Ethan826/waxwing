module Features.Check.Site (Site) where

import Domain.Syntax (Span)

-- Where the leading labels of the current row were written (a signature,
-- a `with` installation, a `handle`): `count` labels from `span`, the
-- innermost site first. A label's occurrence is then the site's span and
-- its position within the site, whatever has been installed around it.
type Site = { span ∷ Span, count ∷ Int }
