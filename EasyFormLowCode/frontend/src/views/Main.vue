<template>
    <div class="main">
        <div class="left">
            <div class="logo">EasyForm</div>
            <div class="menu-list">
                <div class="menu-item">工作台</div>
                <div class="menu-item">项目管理</div>
                <div class="menu-item">页面设计</div>
                <div class="menu-item">页面预览</div>
                <div class="menu-item">系统设置</div>
                    
            </div>
                
           
        </div>
        <div class="right">
            <router-view v-slot="{Component}">
                <keep-alive include="formdesigner">
                    <component :is="Component" ref="componentRef"></component>
                </keep-alive>
            </router-view>
       
        </div>
   
    </div>



</template>


<script setup>
import router from '@/router';
import { routeLocationKey } from 'vue-router';




</script>


<style lang="scss" scoped>
.main {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 100vh;
}

.left {
    width: 150px;
    height: 100%;

}

.right {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    background-color: #ffffff;
}

.logo{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 50px;
    font-size: 20px;
    font-weight: bold;
    
}
.menu-list{
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}
.menu-item{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 50px;

}

</style>

