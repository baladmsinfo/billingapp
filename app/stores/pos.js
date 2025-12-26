export const usePOSStore = defineStore('pos', {
    state: () => ({
        products: [],
        categories: [],
        pagination: {
            page: 1,
            take: 20,
            total: 0,
        },
        loading: false,
        error: null,
        cart: null,
        cartId: null
    }),

    actions: {

        async initalizeCart(payload = {}) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            const localCartId = localStorage.getItem('currentCartId')

            if (localCartId) {
                this.cartId = JSON.parse(localCartId)
            } else {
                this.cartId = null
            }

            if (this.cartId) {
                try {
                    const res = await $axios.get(
                        `${config.public.API_ENDPOINT}/api/pos/cart/${this.cartId}`
                    )

                    console.log("Initalize Cart:", res);

                    if (res.data.statusCode == "09") {
                        const res = await $axios.post(
                            `${config.public.API_ENDPOINT}/api/pos/cart/initalize`,
                            payload
                        )

                        if (res.data.statusCode == "00") {
                            this.cart = res.data.data.cart.items
                            this.cartId = res.data.data.cart.id
                            localStorage.setItem('currentCartId', JSON.stringify(this.cartId))
                        }

                        return
                    }

                    const cartData = res.data.data

                    this.cartId = cartData.id


                    this.cart = (cartData.items || []).map(ci => ({
                        cartItemId: ci.id,
                        itemId: ci.itemId,
                        productId: ci.productId,
                        name: ci.item?.product?.name || ci.item?.name || "Unknown",
                        price: ci.price,
                        qty: ci.quantity,
                        total: ci.total,
                        taxrate: ci.taxRate,
                        taxRateId: ci.taxRateId
                    }))

                } catch (err) {
                    console.error("Fetch cart failed:", err)
                    throw err
                }

            } else {

                try {
                    const res = await $axios.post(
                        `${config.public.API_ENDPOINT}/api/pos/cart/initalize`,
                        payload
                    )

                    if (res.data.statusCode == "00") {
                        this.cart = res.data.data.cart.items
                        this.cartId = res.data.data.cart.id
                        localStorage.setItem('currentCartId', JSON.stringify(this.cartId))
                    }

                } catch (err) {
                    console.error('Failed to create cart:', err)
                }
            }
        },

        async fetchProducts(page = 1, take = 20) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            this.loading = true
            this.error = null

            try {
                const response = await $axios.get(
                    `${config.public.API_ENDPOINT}/api/pos/products`,
                    {
                        params: { page, take }
                    }
                );

                const res = response.data

                if (res.statusCode === '00') {
                    this.products = res.data || []
                    this.pagination.page = res.pagination?.page || page
                    this.pagination.take = res.pagination?.take || take
                    this.pagination.total = res.pagination?.total || 0
                } else {
                    throw new Error(res.message || 'Failed to fetch products')
                }

                return res
            } catch (err) {
                console.error('Product fetch failed:', err)
                this.error = err.message || 'Error fetching products'
            } finally {
                this.loading = false
            }
        },

        async addToCart(payload) {
            const { $axios } = useNuxtApp();
            const config = useRuntimeConfig();

            try {
                const res = await $axios.post(
                    `${config.public.API_ENDPOINT}/api/pos/cart/add`,
                    payload
                );

                const data = res.data;

                if (data.statusCode !== '00') {
                    throw new Error(data.message || "Failed to add item to cart");
                }

                const fullCart = data.data.items || data.data.cart?.items || [];
                const products = this.products;


                this.cart = fullCart.map(ci => {
                    const p = products.find(pr => pr.id === ci.productId);
                    return {
                        id: ci.id,
                        itemId: ci.itemId,
                        productId: ci.productId,
                        name: p?.name || "",
                        price: ci.price,
                        qty: ci.quantity,
                        total: ci.total,
                        taxrate: ci.taxRate,
                        taxRateId: ci.taxRateId
                    };
                });

                this.cartId = data.data.id || data.data.cartId || this.cartId;

                console.log("🛒 Cart updated:", this.cart);

                return data
            } catch (err) {
                console.error("Add to cart error:", err);
                alert(err.message || "Something went wrong");
            }
        },

        async fetchCart(cartId) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {
                const res = await $axios.get(
                    `${config.public.API_ENDPOINT}/api/pos/cart/${cartId}`
                )

                if (res.data.statusCode !== "00") {
                    throw new Error(res.data.message || "Failed to fetch cart")
                }

                const cartData = res.data.data

                this.cartId = cartData.id


                this.cart = (cartData.items || []).map(ci => ({
                    cartItemId: ci.id,
                    itemId: ci.itemId,
                    productId: ci.productId,
                    name: ci.item?.product?.name || ci.item?.name || "Unknown",
                    price: ci.price,
                    qty: ci.quantity,
                    total: ci.total,
                    taxrate: ci.taxRate,
                    taxRateId: ci.taxRateId
                }))

                console.log("🛒 Fetch updated:", this.cart);

                return res.data

            } catch (err) {
                console.error("Fetch cart failed:", err)
                throw err
            }
        },

        async getDraftCarts() {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {
                const res = await $axios.get(
                    `${config.public.API_ENDPOINT}/api/pos/cart/drafts`
                )

                console.log("Draft Carts", res);


                if (res.data.statusCode !== "00") {
                    throw new Error(res.data.message || "Failed to fetch draft carts")
                }

                return res.data.data      // returns array of draft carts
            } catch (err) {
                console.error("Fetch draft carts failed:", err)
                throw err
            }
        },

        // async finishCart(cartId) {
        //     const { $axios } = useNuxtApp()
        //     const config = useRuntimeConfig()

        //     try {
        //         console.log("Deleted Cart and Customer");

        //         const res = await $axios.post(
        //             `${config.public.API_ENDPOINT}/api/pos/cart/${cartId}/finish`)

        //         if (res.data.statusCode === "00" || res.data.status === "success") {
        //             this.cart = []
        //             this.cartId = null
        //         }

        //         return res.data
        //     } catch (err) {
        //         console.error("finishCart error:", err)
        //     }
        // },

        async saveDraft(payload) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {

                const res = await $axios.post(
                    `${config.public.API_ENDPOINT}/api/pos/cart/save-draft`, payload)

                if (res.data.statusCode === "00" || res.data.status === "success") {
                    this.cart = []
                    this.cartId = null
                }

                return res.data
            } catch (err) {
                console.error("finishCart error:", err)
            }
        },

        async discardCart(payload) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {

                const res = await $axios.post(
                    `${config.public.API_ENDPOINT}/api/pos/cart/discard-cart`, payload)

                if (res.data.statusCode === "00" || res.data.status === "success") {
                    this.cart = []
                    this.cartId = null
                }

                return res.data
            } catch (err) {
                console.error("finishCart error:", err)
            }
        },

        async removeCartItem(cartItemId) {
            const { $axios } = useNuxtApp();
            const config = useRuntimeConfig();

            if (!this.cartId) {
                console.error("No cartId found — cannot remove item");
                return;
            }

            try {
                const res = await $axios.delete(
                    `${config.public.API_ENDPOINT}/api/pos/cart/item/${cartItemId}`
                );

                return res

            } catch (err) {
                console.error("Delete cart item error:", err);
                alert(err.message || "Something went wrong");
            }
        },

        async incrementCartItem(cartItemId) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {
                const res = await $axios.put(
                    `${config.public.API_ENDPOINT}/api/pos/cart/item/${cartItemId}/increment`
                )

                const ci = this.cart.find(i => i.cartItemId === cartItemId)
                if (ci) {
                    ci.qty += 1
                    ci.total = ci.qty * ci.price
                }

                return res.data
            } catch (err) {
                console.error("Increment item error:", err)
                alert(err.message || "Failed to increment item")
            }
        },

        async decrementCartItem(cartItemId) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {
                const res = await $axios.put(
                    `${config.public.API_ENDPOINT}/api/pos/cart/item/${cartItemId}/decrement`
                )

                console.log(res.data?.count, res.data?.id);


                if (res.data?.count === undefined && res.data?.id) {
                    console.log("if");

                    const ci = this.cart.find(i => i.cartItemId === cartItemId)
                    if (ci) {
                        ci.qty -= 1
                        ci.total = ci.qty * ci.price
                    }
                } else {
                    this.cart = this.cart.filter(i => i.cartItemId !== cartItemId)
                }

                return res.data
            } catch (err) {
                console.error("Decrement item error:", err)
                alert(err.message || "Failed to decrement item")
            }
        },

        async completePayment(payload) {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {

                const res = await $axios.post(
                    `${config.public.API_ENDPOINT}/api/pos/checkout`, payload)

                console.log(res);

                if (res.data.statusCode === "00" || res.data.status === "success") {
                    this.cart = []
                    this.cartId = null
                }

                return res.data
            } catch (err) {
                console.error("finishCart error:", err)
            }
        },

        async fetchCategories() {
            const { $axios } = useNuxtApp()
            const config = useRuntimeConfig()

            try {
                const res = await $axios.get(`${config.public.API_ENDPOINT}/api/pos/categories`)

                if (res.data.statusCode === '00') {
                    this.categories = res.data.data || []
                } else {
                    throw new Error(res.data.message)
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err)
            }
        },
    },
})