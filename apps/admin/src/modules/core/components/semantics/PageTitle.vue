<template>
	<h1>{{$t(title)}}<template v-if="itemName">: <i>{{itemName}}</i></template></h1>
</template>
<script>
  export default {
    name: 'PageTitle',
    props: {
      title: String,
      itemName: String
    }
  }
</script>

<style scoped lang="scss">
	h1 i {
    color: var(--main-color);
	}
</style>
