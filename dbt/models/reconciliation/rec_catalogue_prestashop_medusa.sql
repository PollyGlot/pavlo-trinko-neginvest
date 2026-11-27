with prestashop as (
    select
        shop.name as marque,
        product.id_product as prestashop_id,
        product.reference
    from {{ source('prestashop', 'ps_product_shop') }} as product
    join {{ source('prestashop', 'ps_shop') }} as shop using (id_shop)
    where product.active = 1
),

medusa as (
    select
        product.metadata:prestashop_id::number as prestashop_id,
        channel.name as marque,
        product.status
    from {{ source('medusa', 'product') }} as product
    join {{ source('medusa', 'product_sales_channel') }} as link
        on link.product_id = product.id
    join {{ source('medusa', 'sales_channel') }} as channel
        on channel.id = link.sales_channel_id
    where product.deleted_at is null
),

medusa_any_channel as (
    select distinct prestashop_id
    from medusa
)

select
    prestashop.marque,
    prestashop.prestashop_id,
    prestashop.reference,
    case
        when medusa.prestashop_id is not null and medusa.status = 'published' then 'en_ligne'
        when medusa.prestashop_id is not null then 'non_publie'
        when medusa_any_channel.prestashop_id is not null then 'pas_dans_le_canal'
        else 'absent'
    end as etat
from prestashop
left join medusa
    on medusa.prestashop_id = prestashop.prestashop_id
    and medusa.marque = prestashop.marque
left join medusa_any_channel
    on medusa_any_channel.prestashop_id = prestashop.prestashop_id
